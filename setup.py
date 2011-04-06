# -*- coding: utf-8 -*-
try:
    from setuptools import setup, find_packages
except ImportError:
    from ez_setup import use_setuptools
    use_setuptools()
    from setuptools import setup, find_packages

setup(
    name='geoeuropeana',
    version='0.1dev',
    description='Wrapper for the Europeana API to return GeoRSS + Demo app',
    author=u'Adrià Mercader',
    author_email='amercadero@gmail.com',
    url='http://amercader.net',
    install_requires=[
        "Pylons>=0.9.7",
        "lxml>=2.3"
    ],
    setup_requires=["PasteScript>=1.6.3"],
    packages=find_packages(exclude=['ez_setup']),
    include_package_data=True,
    test_suite='nose.collector',
    package_data={'geoeuropeana': ['i18n/*/LC_MESSAGES/*.mo']},
    #message_extractors={'geoeuropeana': [
    #        ('**.py', 'python', None),
    #        ('public/**', 'ignore', None)]},
    zip_safe=False,
    paster_plugins=['PasteScript', 'Pylons'],
    entry_points="""
    [paste.app_factory]
    main = geoeuropeana.config.middleware:make_app

    [paste.app_install]
    main = pylons.util:PylonsInstaller
    """,
)
