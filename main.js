config = {
  style: 'mapbox://styles/wannes-vlaanderen/cljr57cuw012001o44tm7g8p5',
  accessToken: 'pk.eyJ1Ijoid2FubmVzLXZsYWFuZGVyZW4iLCJhIjoiY2xqb2Q0MDUxMDhjeDNtcGIxNjF4a2lrbyJ9.TmBAlCtIR-SS3YXwXvUJlA',
  CSV: 'https://docs.google.com/spreadsheets/d/1pl7qzIDsJKbphDnttGxdPnezsv_x65vBhflATXVacDo/gviz/tq?tqx=out:csv&sheet=Sheet1',
  center: [5.524,50.928],
  zoom: 12,
  popupInfo: ['HuidigeTitel'],
  popupInfo2: ['Link'],
  popupInfo3: ['Description'],
  // sidebar.js
  title: 'Gebiedsprogramma\nPoort-Limburg',
  description: 'Aan te vullen',
  sideBarInfo: ['HuidigeTitel'],
  // legende.js
  legende: {
    "#e8da11": "Nieuw bedrijventerrein",
    "#3d4f71": "Deelproject herstructurering",
    "#b0a8c2": "Herstructuring en Inbreiding",
    "#58ad6a": "Open ruimte",
    "#f8b06d": "Infrastructuurproject"
  }
}

const bounds = [ // these coordinates represents the edges of the map
  [1.5,48.5], // [west, south]
  [7,53.75]  // [east, north]
];
createSidebar()

const title = document.getElementById('title');
if (title) {title.innerText = config.title;}
const description = document.getElementById('description');
if (description) {description.innerText = config.description;}

mapboxgl.accessToken = config.accessToken;

const map = new mapboxgl.Map({
  container: 'map',
  style: config.style,
  center: config.center,
  zoom: config.zoom,
  transformRequest: transformRequest,
  attrubutionControl: false
});

map.addControl(new Legenda(config.legende), "top-right")
map.addControl(new LogoVlaanderen(), "top-left")
map.addControl(new mapboxgl.AttributionControl({
  customAttribution: "<a href="https://vlaanderen.be">Vlaamse Overheid</a>"
}))

let geoJSONData = {};
const filteredGeoJSON = {
  type: "FeatureCollection",
  features: []
};

function transformRequest(url) {
  const isMapboxRequest =
    url.slice(8, 22) === 'api.mapbox.com' ||
    url.slice(10, 26) === 'tiles.mapbox.com';
  return {
    url: isMapboxRequest ? url.replace('?', '?pluginName=finder&') : url,
  };
}

function flyToLocation(currentFeature) {
  map.flyTo({
    center: currentFeature,
    zoom: 13
  })
};

function createPopup(currentFeature) {
  const popups = document.getElementsByClassName('mapboxgl-popup');
  /** Check if there is already a popup on the map and if so, remove it */
  if (popups[0]) popups[0].remove();
  new mapboxgl.Popup({ closeOnClick: true })
    .setLngLat(currentFeature.geometry.coordinates)
    .setHTML(`<h3 style="font-weight:700;font-size:18;">${currentFeature.properties[config.popupInfo]}</h3><br><p>${currentFeature.properties[config.popupInfo3]}</p><br><a href"${popupInfo2}">Meer info</a>`)
    .addTo(map);
};

function sortByDistance(selectedPoint) {
  const options = { units: 'miles' };
  let data;
  if (filteredGeojson.features.length > 0) {
    data = filteredGeojson;
  } else {
    data = geojsonData;
  }
  data.features.forEach((data) => {
    Object.defineProperty(data.properties, 'distance', {
      value: turf.distance(selectedPoint, data.geometry, options),
      writable: true,
      enumerable: true,
      configurable: true,
    });
  });

  data.features.sort((a, b) => {
    if (a.properties.distance > b.properties.distance) {
      return 1;
    }
    if (a.properties.distance < b.properties.distance) {
      return -1;
    }
    return 0; // a must be equal to b
  });
  const listings = document.getElementById('listings');
  while (listings.firstChild) {
    listings.removeChild(listings.firstChild);
  }
  buildLocationList(data);
}



function makeGeoJSON(csvData) {
  csv2geojson.csv2geojson(
    csvData,
    {
      latfield: 'Latitude',
      lonfield: 'Longitude',
      delimiter: ',',
    },
    (err, data) => {
      data.features.forEach((data, i) => {
        data.properties.id = i;
      });

      geojsonData = data;
      // Add the the layer to the map
      map.addLayer({
        id: 'locationData',
        type: 'circle',
        source: {
          type: 'geojson',
          data: geojsonData,
        },
        paint: {
          'circle-radius': 5, // size of circles
          'circle-color': '#90884c', // color of circles
          'circle-stroke-color': 'white',
          'circle-stroke-width': 1,
          'circle-opacity': 0.7,
        },
      });
    },
  );
  try {
    buildLocationList(geojsonData);
  }
  catch(err) {
    console.log(err);
  }
}

map.on('load', () => {

  // csv2geojson - following the Sheet Mapper tutorial https://www.mapbox.com/impact-tools/sheet-mapper
  console.log('loaded');
  $(document).ready(() => {
    console.log('ready');
    $.ajax({
      type: 'GET',
      url: config.CSV,
      dataType: 'text',
      success: function (csvData) {
        makeGeoJSON(csvData);
      },
      error: function (request, status, error) {
        console.log(request);
        console.log(status);
        console.log(error);
      },
    });
  });
});

map.on('click', 'locationData', (e) => {
  const features = map.queryRenderedFeatures(e.point, {
    layers: ['locationData'],
  });
  const clickedPoint = features[0].geometry.coordinates;
  flyToLocation(clickedPoint);
  sortByDistance(clickedPoint);
  createPopup(features[0]);
});

map.on('mouseenter', 'locationData', () => {
  map.getCanvas().style.cursor = 'pointer';
});

map.on('mouseleave', 'locationData', () => {
  map.getCanvas().style.cursor = '';
});


map.setMaxBounds(bounds);






