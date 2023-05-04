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
import {transform} from 'ol/proj.js';
const raster = new TileLayer({
  source: new OSM(),
});

const source = new VectorSource();

const vector = new VectorLayer({
  source: source,
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#ffcc33',
    'stroke-width': 2,
    'circle-radius': 7,
    'circle-fill-color': '#ffcc33',
  },
});

/**
 * Currently drawn feature.
 * @type {import("../src/ol/Feature.js").default}
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

/**
 * Handle pointer move.
 * @param {import("../src/ol/MapBrowserEvent").default} evt The event.
 */
const pointerMoveHandler = function (evt) {
  if (evt.dragging) {
    return;
  }

  helpTooltipElement.innerHTML = 'Click to continue drawing the polygon';
  helpTooltip.setPosition(evt.coordinate);

  helpTooltipElement.classList.remove('hidden');
};

const map = new Map({
  layers: [raster, vector],
  target: 'map',
  view: new View({
    center: transform([14.277968, 48.280201], 'EPSG:4326', 'EPSG:900913'),
    zoom: 20,
  }),
});

const modify = new Modify({source: source});
map.addInteraction(modify);

const snap = new Snap({source: source});
map.addInteraction(snap);

map.on('pointermove', pointerMoveHandler);

map.getViewport().addEventListener('mouseout', function () {
  helpTooltipElement.classList.add('hidden');
});

let draw; // global so we can remove it later

/**
 * Format area output.
 * @param {Polygon} polygon The polygon.
 * @return {string} Formatted area.
 */
const formatArea = function (polygon) {
  const area = getArea(polygon);

  if (area > 10000) {
    return Math.round((area / 1000000) * 100) / 100 + ' ' + 'km<sup>2</sup>';
  }

  return Math.round(area * 100) / 100 + ' ' + 'm<sup>2</sup>';
};

function addInteraction() {
  draw = new Draw({
    source: source,
    type: 'Polygon',
    style: new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
      stroke: new Stroke({
        color: 'rgba(0, 0, 0, 0.5)',
        lineDash: [10, 10],
        width: 2,
      }),
      image: new CircleStyle({
        radius: 5,
        stroke: new Stroke({
          color: 'rgba(0, 0, 0, 0.7)',
        }),
        fill: new Fill({
          color: 'rgba(255, 255, 255, 0.2)',
        }),
      }),
    }),
  });

  map.addInteraction(draw);

  createMeasureTooltip();
  createHelpTooltip();

  let listener;
  draw.on('drawstart', function (evt) {
    // set sketch
    sketch = evt.feature;

    /** @type {import("../src/ol/coordinate.js").Coordinate|undefined} */
    let tooltipCoord = evt.coordinate;

    listener = sketch.getGeometry().on('change', function (evt) {
      const geom = evt.target;
      let output;
      output = formatArea(geom);
      tooltipCoord = geom.getInteriorPoint().getCoordinates();
      measureTooltipElement.innerHTML = output;
      measureTooltip.setPosition(tooltipCoord);
    });

    //map.getLayers().getArray()[1].getSource().clear();

    const allGeometries = map
      .getLayers()
      .getArray()[1]
      .getSource()
      .getFeatures();

    allGeometries.forEach(function (geometries) {
      var coordinates = geometries.getGeometry().getArea();

      console.log(coordinates);
    });
  });

  draw.on('drawend', function () {
    measureTooltipElement.className = 'ol-tooltip ol-tooltip-static';
    measureTooltip.setOffset([0, -7]);
    // unset sketch
    sketch = null;
    // unset tooltip so that a new one can be created
    measureTooltipElement = null;
    createMeasureTooltip();
    unByKey(listener);
  });
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
