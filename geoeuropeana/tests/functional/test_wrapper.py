from geoeuropeana.tests import *

class TestWrapperController(TestController):

    def test_index(self):
        response = self.app.get(url(controller='wrapper', action='index'))
        # Test response...
