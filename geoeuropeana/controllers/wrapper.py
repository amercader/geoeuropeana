import logging

from pylons import request, response, session, tmpl_context as c
from pylons.controllers.util import abort

from geoeuropeana.lib.base import BaseController

import urllib2
from lxml import etree

log = logging.getLogger(__name__)

class WrapperController(BaseController):
    
    api_base = 'http://api.europeana.eu/api/opensearch.rss'
    
    namespaces = {
        'srw':{
            'srw':'http://www.loc.gov/zing/srw/',
            'dc':'http://purl.org/dc/elements/1.1/',
            'enrichment':'http://www.europeana.eu/schemas/ese/enrichment/'
        },
        'georss': 'http://www.georss.org/georss'
    }
    
    xpaths = {
        'rss':{
            'item': '/rss/channel/item[%i]',
            'links': '/rss/channel/item/link/text()'
        },
        'srw':{
            'lat':'/srw:searchRetrieveResponse/srw:records/srw:record/srw:recordData/dc:dc/enrichment:place_latitude/text()',
            'lon':'/srw:searchRetrieveResponse/srw:records/srw:record/srw:recordData/dc:dc/enrichment:place_longitude/text()'
        }
    }

    def index(self):
        #searchTerms=enrichment_place_latitude%3A[42+TO+48]+AND+enrichment_place_longitude%3A[10+TO+15]&wskey=xxx

        if not 'searchTerms' in request.params or \
            not 'wskey' in request.params:
            abort(400,'Please provide searchParams and wskey')

        # Perform the query to the actual Europeana API
        url = self.api_base + '?' + request.query_string

        
        try:
            index = urllib2.urlopen(url)
        except urllib2.HTTPError as e:
            abort(500,e.msg)

        index_tree = etree.fromstring(index.read())
        links = index_tree.xpath(self.xpaths['rss']['links'])
        
        GEORSS_NAMESPACE = 'http://www.georss.org/georss'
        GEORSS = '{%s}' % GEORSS_NAMESPACE
        NSMAP = {'georss':GEORSS_NAMESPACE}

        i = 1
        for link in links:
            # Get the SRW document for each result
            try:
                srw = urllib2.urlopen(link)
            except urllib2.HTTPError:
                continue
            
            # Parse response
            srw_tree = etree.fromstring(srw.read())
            
            # Get lat / lon
            lat = srw_tree.xpath(self.xpaths['srw']['lat'],namespaces=self.namespaces['srw'])[0]
            lon = srw_tree.xpath(self.xpaths['srw']['lon'],namespaces=self.namespaces['srw'])[0]
            #<georss:point>42.405524 -71.142273</georss:point> 
            
            # Inject a point tag in the corresponding index item
            xpath = self.xpaths['rss']['item'] % i
            
            item = index_tree.xpath(xpath)[0]
            point = etree.SubElement(item,GEORSS+'point',nsmap=NSMAP)
            point.text = '%s %s' % (lat,lon)
            i = i + 1
        response.content_type = 'application/rss+xml'
        out = '<?xml version="1.0" encoding="UTF-8"?>\n'
        out = out + etree.tostring(index_tree)

        return out

