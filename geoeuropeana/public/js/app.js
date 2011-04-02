// App namespace (for Geo Europeana)
var GE = function($){

    API_URL = "api/opensearch.rss";
    
    API_KEY = "LTRGRDYQGD";
    
    return {
        /*
        *  bounds are OpenLayers.Bounds
        */
        map: null,
        
        selectControl: null,
        
        selectedFeature: null,
        
        currentBounds: null,
        
        currentPage: null,
        
        totalPages: null,
        
        query: function(bounds,page){
            if (!bounds)
                bounds = GE.currentBounds;
                        
            if (!bounds)
                return false;

            page = page || 1;            
            
            GE.currentBounds = bounds;
            GE.currentPage = page;
                        
            if (API_URL.indexOf("?") === -1)
                API_URL += "?";
                
            var spatial_query = "enrichment_place_latitude%3A[" + bounds.bottom + "+TO+" + bounds.top + "]+AND+" +
                                "enrichment_place_longitude%3A[" + bounds.left + "+TO+" + bounds.right + "]";

            var period_query = false;
            var period = $("#period").val()

            if (period != "all") 
                period_query = "enrichment_period_term%3A\"http%3A%2F%2Fannocultor.eu%2Ftime%2F" + period + "\""

            url = "";
            
            url += "searchTerms="+ spatial_query;
            if (period_query) url += "+AND+" + period_query;
            url += "&startPage=" + page;
            url += "&wskey=" + API_KEY;

            url = API_URL + url;
            console.log(url);
            //TEST
            //url = "test_response.xml";
            
            if ($("#message").is(":visible")) $("#message").hide("slide",{ direction: "up" },1000);
            $("#loading").show("slide",{ direction: "up" },500);

            $.get(url,function(data,status,xhr){
                if (status != "success"){
                    alert("NOP: "+status)
                    return false;
                    }
                
                if ($("#nav").is(":hidden")) $("#nav").show();

                GE.totalResults = $(data).find("totalResults").text();
                GE.totalPages = Math.ceil(GE.totalResults / 12);
                var countMsg = "Page " + GE.currentPage + " of " + GE.totalPages;
                $("#count").html(countMsg);

                
                var georss = new OpenLayers.Format.CustomGeoRSS({
                    internalProjection: new OpenLayers.Projection("EPSG:900913"),
                    externalProjection: new OpenLayers.Projection("EPSG:4326")
                });
                var features = georss.read(xhr.responseText);
                
                $("#loading").hide("slide",{ direction: "up" },500);

                if (features.length){
                    var resultsLayer = GE.map.getLayersByName("Results")[0];
                    resultsLayer.destroyFeatures();
                    resultsLayer.addFeatures(features);
                } else {
                    $("#message").html("No results found").show("slide",{ direction: "up" },500);
                }

            })
            
        },
        
        onResultSelected: function(event){
            var feature = event.feature;
            GE.selectedFeature = feature;

            //TODO: use jQuery templates
            var html = "<div class=\"popup\">";
                
//           html += "<div class=\"data\">"
            if (feature.data.title.trim()){
                html += "<div class=\"title\">" + feature.data.title +"</div>";
            } else {
                html += "<div class=\"notitle\">No title</div>";
            }
            html += "<div class=\"link\"><a href=\"" + feature.data.link.replace(/\.srw\?wskey=(.*)/,".html") + "\" target=\"_blank\">View in Europeana</a></div>";
            html += "<div class=\"description\">" + feature.data.description +"</div>";
            //TODO: Check if its an image, sound or video with enclosureType
            if (feature.data.enclosureUrl)
                html += "<div class=\"img\"><img src=\"" + feature.data.enclosureUrl + "\" alt=\"No Image available\" /></div>"

 
            html += "</div>"

            var popup = new OpenLayers.Popup.FramedCloud("Feature Info",
                feature.geometry.getBounds().getCenterLonLat(),
                null,
                html,
                null, true, GE.onPopupClose);

            feature.popup = popup;
            GE.map.addPopup(popup);

            return false;        
        },
        
        onPopupClose: function(event){
            GE.selectControl.unselect(GE.selectedFeature);
            GE.selectedFeature = null;
        },

        onResultUnselected: function(event){
            GE.map.removePopup(event.feature.popup);
            event.feature.popup.destroy();
            event.feature.popup = null;
        }
    }

}(jQuery)




/*
* Extension of the OpenLayers.Format.GeoRSS class that also collects the
* enclosure of the items and save it in the features data
*/
OpenLayers.Format.CustomGeoRSS = OpenLayers.Class(OpenLayers.Format.GeoRSS,{
    /**
     * Method: createFeatureFromItem
     * Return a feature from a GeoRSS Item.
     *
     * Parameters:
     * item - {DOMElement} A GeoRSS item node.
     *
     * Returns:
     * {<OpenLayers.Feature.Vector>} A feature representing the item.
     */
    createFeatureFromItem: function(item) {
        var enclosure = this.getElementsByTagNameNS(item, "*", "enclosure")[0];
        var feature = OpenLayers.Format.GeoRSS.prototype.createFeatureFromItem.apply(this, arguments);

        if (enclosure){
            var enclosureUrl = enclosure.getAttribute("url");
            if (enclosureUrl)
                feature.data["enclosureUrl"] = enclosureUrl;
                
            var enclosureType = enclosure.getAttribute("type");
            if (enclosureType)
                feature.data["enclosureType"] = enclosureType;
        }
        //TODO: attributes?
        
        return feature;
    }
});

// Custom control to handle clicks on the map
OpenLayers.Control.BoxQuery = OpenLayers.Class(OpenLayers.Control, {
    type: OpenLayers.Control.TYPE_TOOL,
    
    boxLayer: null,

    draw: function() {
        this.boxLayer = this.map.getLayersByName("Query")[0];
        this.handler = new OpenLayers.Handler.Box( this,
                            {done: this.done},{'keyMask':OpenLayers.Handler.MOD_CTRL});
    },
    
    done: function(position){
        // We need a bounding box
        if (position instanceof OpenLayers.Bounds) {
            var bounds;
            var minXY = this.map.getLonLatFromPixel(
                        new OpenLayers.Pixel(position.left, position.bottom));
            var maxXY = this.map.getLonLatFromPixel(
                        new OpenLayers.Pixel(position.right, position.top));
            bounds = new OpenLayers.Bounds(minXY.lon, minXY.lat,
                                           maxXY.lon, maxXY.lat);
        } else {
            return false;
        }
   
        this.boxLayer.destroyFeatures();
        
        // Add new query extent
        this.boxLayer.addFeatures([
            new OpenLayers.Feature.Vector(bounds.toGeometry())
        ]);
        
        // Transform bounds to wgs84
        bounds.transform(this.map.getProjectionObject(),
        new OpenLayers.Projection("EPSG:4326"));
        
        // Launch query
        GE.query(bounds);

    }


});


$(document).ready(function(){
    $("#period").change(function(){
        GE.query(false,1)
    });

    $("#first").click(function(){
        GE.query(false,1)
    });

    $("#previous").click(function(){
        if (GE.currentPage > 1)
            GE.query(false,GE.currentPage - 1)
    });

    $("#next").click(function(){
        if (GE.currentPage < GE.totalPages)
            GE.query(false,GE.currentPage + 1)
    });

    $("#last").click(function(){
        if (GE.totalPages)
            GE.query(false,GE.totalPages)
    });

    // Set map div size
    $("#map").width($(window).width() * 0.7);
    $("#map").height(500);

    // Set element positions
    $("#loading").css("left",$("#map").width()/2 - $("#loading").width()/2);
    $("#message").css("left",$("#map").width()/2 - $("#message").width()/2);
    var noticeTop = $("#map").position().top;
    $("#loading").css("top",noticeTop);
    $("#message").css("top",noticeTop);


    // Create a new map
    var map = new OpenLayers.Map("map" ,
    {
        projection: new OpenLayers.Projection("EPSG:900913"),
        displayProjection: new OpenLayers.Projection("EPSG:4326"),
        units: "m",
        fallThrough: true,
        controls: [
        new OpenLayers.Control.LayerSwitcher(),
        new OpenLayers.Control.Navigation(),
        new OpenLayers.Control.Attribution()
        ]
    });

    // Create layers to add
    var layers = [
    osm = new OpenLayers.Layer.OSM("Simple OSM Map"),
    bing = new OpenLayers.Layer.Bing({
            key: "AjtIygmd5pYzN3AaY3l_wLlbM2rW5CxbFaLzjxksZptvovvMVAKFwmJ_NDSVcfQu",
            type: "Aerial"
        }),
    query = new OpenLayers.Layer.Vector("Query",{
        projection: new OpenLayers.Projection("EPSG:4326"),
        styleMap: new OpenLayers.StyleMap({
                strokeWidth: 4,
                strokeColor: "#ff0000",
                fillOpacity: 0
            })
    }),
        
    results = new OpenLayers.Layer.Vector("Results",{
        projection: new OpenLayers.Projection("EPSG:4326"),
        styleMap: new OpenLayers.StyleMap({
            cursor: "pointer",
            externalGraphic:"./img/marker.png",
            graphicWidth:12,
            graphicHeight:20
        })
    })
    ];
    map.addLayers(layers);
    
    var query = new OpenLayers.Control.BoxQuery();
    map.addControl(query);
    query.activate();

    var select = new OpenLayers.Control.SelectFeature(
        results,
        {
            hover: false,
            multiple: false
        })
    map.addControl(select);
    select.activate();

    results.events.register("featureselected",this,GE.onResultSelected);
    results.events.register("featureunselected",this,GE.onResultUnselected);


    map.setCenter(
        new OpenLayers.LonLat(7.20703125,49.61070993807422).transform(
            new OpenLayers.Projection("EPSG:4326"),map.getProjectionObject()), 4
        );

    GE.map = map;
    GE.selectControl = select;


}
);
