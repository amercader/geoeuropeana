"""Pylons environment configuration"""
import os

from pylons import config

import geoeuropeana.lib.app_globals as app_globals
import geoeuropeana.lib.helpers
from geoeuropeana.config.routing import make_map

def load_environment(global_conf, app_conf):
    """Configure the Pylons environment via the ``pylons.config``
    object
    """
    # Pylons paths
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    paths = dict(root=root,
                 controllers=os.path.join(root, 'controllers'),
                 static_files=os.path.join(root, 'public'),
                 templates=[os.path.join(root, 'templates')])

    # Initialize config with the basic options
    config.init_app(global_conf, app_conf, package='geoeuropeana', paths=paths)

    config['routes.map'] = make_map()
    config['pylons.app_globals'] = app_globals.Globals()
    config['pylons.h'] = geoeuropeana.lib.helpers

    # CONFIGURATION OPTIONS HERE (note: all config options will override
    # any Pylons config options)
