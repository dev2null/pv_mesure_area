import {Draw, Modify, Snap} from 'ol/interaction.js';
import Map from 'ol/Map.js';
import Overlay from 'ol/Overlay.js';
import View from 'ol/View.js';
import {Circle as CircleStyle, Fill, Stroke, Style} from 'ol/style.js';
//import {Polygon} from 'ol/geom.js';
import {OSM, Vector as VectorSource} from 'ol/source.js';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer.js';
import {getArea} from 'ol/sphere.js';
import {unByKey} from 'ol/Observable.js';
import {fromLonLat} from 'ol/proj.js';
import {v4 as uuidv4} from 'uuid';


const polygons = {};
let polygonType = document.getElementById('type');
let roofSelect = document.getElementById('roof');


const raster = new TileLayer({
  source: new OSM(),

  // source: new XYZ({
  //   url: 'https://{a-c}.tile.thunderforest.com/cycle/{z}/{x}/{y}.png' +
  //     '?apikey=Your API key from http://www.thunderforest.com/docs/apikeys/ here'
  // })
});

const source = new VectorSource();

const vector = new VectorLayer({
  source: source,
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#002cff',
    'stroke-width': 2,
    'circle-radius': 3,
    'circle-fill-color': '#ffcc33',
  },
});

/**
 * Currently drawn feature.
 * @type {import('../src/ol/Feature.js').default}
 */
let sketch;

/**
 * The help tooltip element.
 * @type {HTMLElement}
 */
let helpTooltipElement;

/**
 * Overlay to show the help messages.
 * @type {Overlay}
 */
let helpTooltip;

/**
 * The measure tooltip element.
 * @type {HTMLElement}
 */
let measureTooltipElement;

/**
 * Overlay to show the measurement.
 * @type {Overlay}
 */
let measureTooltip;

let selectedPolygonType = polygonType.value;

polygonType.onchange = function() {
  selectedPolygonType = polygonType.value;
};

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: fromLonLat([14.277968, 48.280201]),
    zoom: 20,
  }),
});

// map.addLayer(new OpenLayers.Layer.XYZ(
//   "Satellite", [
//     "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}"
//   ], {
//     attribution: "Powered by Esri. " +
//       "Source: Esri, DigitalGlobe, GeoEye, Earthstar Geographics, CNES/Airbus DS, USDA, USGS, AeroGRID, IGN, and the GIS User Community",
//     numZoomLevels: 24,
//     sphericalMercator: true
//   }))

const modify = new Modify({source: source});
map.addInteraction(modify);

const snap = new Snap({source: source});
map.addInteraction(snap);

enableMouseOverTooltip();

let draw; // global so we can remove it later

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
const calcArea = function(polygon) {
  let area = getArea(polygon);

  if( roofSelect.value !== 'flat')
    area = area * 1.115;

  if (area > 10000) {
    return Math.round((area / 1000000) * 100) / 100;
  }

  return Math.round(area * 100) / 100;
};


const formatAreaFormatted = function(polygon) {
  let area = getArea(polygon);

  if( roofSelect.value !== 'flat')
    area = area * 1.115;

  if (area > 10000) {
    return Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  }

  return Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
};


function enableMouseOverTooltip() {
  const pointerMoveHandler = function(evt) {
    if (evt.dragging) {
      return;
    }
    helpTooltipElement.innerHTML = 'Click to continue drawing the polygon';
    helpTooltip.setPosition(evt.coordinate);

    helpTooltipElement.classList.remove('hidden');
  };

  map.on('pointermove', pointerMoveHandler);

  map.getViewport().addEventListener('mouseout', function() {
    helpTooltipElement.classList.add('hidden');
  });
}

function addInteraction() {
  draw = new Draw({
    source: source,
    type: 'Polygon',
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: (selectedPolygonType === 'main' ? '#000000' : '#cc0000'),
        width: 2,
      }),
      image: new CircleStyle({
        radius: 3,
        fill: new Fill({
          color: '#ffcc33',
        }),
      }),
    }),
  });

  map.addInteraction(draw);

  createMeasureTooltip();
  createHelpTooltip();

  let listener;
  draw.on('drawstart', function(evt) {

    // set sketch
    sketch = evt.feature;

    /** @type {import('../src/ol/coordinate.js').Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function(evt) {
      const geom = evt.target;
      let output;
      output = formatAreaFormatted(geom);
      tooltipCoord = geom.getInteriorPoint().getCoordinates();
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });


  });

  draw.on('drawend', function(evt) {

    let feature = evt.feature;
    const uuid = uuidv4();

    feature.setId(uuid);
    feature.setProperties({
      type: selectedPolygonType,
      roof: roofSelect.value,
      area: calcArea(feature.getGeometry())
    });

    let style = new Style({
      stroke: new Stroke({
        color: selectedPolygonType === 'main' ? "#000000" : "#cc0000",
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      })
    });

    feature.setStyle(style)

    polygons[uuid] = feature;

    //console.log( polygons );

    // console.log(polygons);
    // console.log(getArea(feature.getGeometry()));

    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);

    calcPVArea();
  });
}

// function listAllPolygons()
// {
//
//   const allGeometries = map
//     .getLayers()
//     .getArray()[1]
//     .getSource()
//     .getFeatures();
//
//   console.log(allGeometries);
//
//
//   allGeometries.forEach(function(geometries) {
//     let area = getArea(geometries.getGeometry());
//     console.log(area);
//   });
//
// }


function calcPVArea()
{
  let availableArea = 0.0;
  let excludedArea = 0.0;
  const avgPvArea = 1.998108;

  for(let x in polygons ){

    const polygon = polygons[x];

    if( polygon.values_.type === 'main' )
      availableArea += polygon.values_.area;
    else
      excludedArea += polygon.values_.area;
  }

  const final = Math.max(0, availableArea - excludedArea);

  document.getElementById('area-all').innerHTML =
    "All: " + availableArea + '<br />' +
    "Excluded: " + excludedArea + '<br />' +
    "Clear: " + final + '<br />' +
    "Number of PV: " + Math.floor(final / avgPvArea);

  //console.log("Clear: " + availableArea);
}

/**
 * Creates a new help tooltip
 */
function createHelpTooltip() {
  if (helpTooltipElement) {
    helpTooltipElement.parentNode.removeChild(helpTooltipElement);
  }
  helpTooltipElement = document.createElement('div');
  helpTooltipElement.className = 'ol-tooltip hidden';
  helpTooltip = new Overlay({
    element: helpTooltipElement,
    offset: [15, 0],
    positioning: 'center-left',
  });
  map.addOverlay(helpTooltip);
}

/**
 * Creates a new measure tooltip
 */
function createMeasureTooltip() {
  if (measureTooltipElement) {
    measureTooltipElement.parentNode.removeChild(measureTooltipElement);
  }
  measureTooltipElement = document.createElement('div');
  measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
  measureTooltip = new Overlay({
    element: measureTooltipElement,
    offset: [0, -15],
    positioning: 'bottom-center',
    stopEvent: false,
    insertFirst: false,
  });
  map.addOverlay(measureTooltip);
}

addInteraction();
