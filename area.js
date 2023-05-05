import {getArea} from 'ol/sphere';
import {v4 as uuidv4} from 'uuid';
import {Fill, Stroke, Style} from 'ol/style';

class AreaPV {

  /**
   *
   * @type {{}}
   */
  polygons = {};

  /**
   * Trina Solar panel 1762x1134x30 mm
   * In square meters
   * @type {number}
   */
  avgPvArea = 1.998108;

  /**
   * Percent of an average roof you may cover
   * @type {number}
   */
  maxDensityPVRoof = 0.75;

  /**
   * Roof slope factors for a pitch angle of 30deg
   * @type {key: number}
   */
  roofSlopeFactors = {
    'flat': 1,
    'gable': 1.155,
    'hip': 1.155,
  };

  constructor() {

    console.log('construct area!');
  }

  /**
   *
   * @param polygon
   * @returns {string}
   */
  formatAreaFormatted(polygon) {

    return this.getAreaPolygon(polygon) + ' ' + this.getFormatUnits(polygon);
  }

  /**
   *
   * @param polygon
   * @returns {string}
   */
  getFormatUnits(polygon) {

    return this.getAreaPolygon(polygon, true) > 10000 ? 'km<sup>2</sup>' : 'm<sup>2</sup>';
  }

  /**
   *
   * @param polygon
   * @param raw
   * @returns {number}
   */
  getAreaPolygon(polygon, raw = false) {
    let area = getArea(polygon);

    //Roof factor
    area *= this.roofSlopeFactors[this.getSelectedRoofType()] ?? 1;

    if (raw)
      return area;

    if (area > 10000) {
      return Math.round((area / 1000000) * 100) / 100;
    }

    return Math.round(area * 100) / 100;
  }

  /**
   *
   * @param polygon
   * @returns {boolean}
   */
  isSquareMeters(polygon) {
    return this.getAreaPolygon(polygon, true) <= 10000;
  }

  /**
   *
   */
  calcPVArea() {
    let availableArea = 0.0;
    let excludedArea = 0.0;

    for (let x in this.polygons) {

      const polygon = this.polygons[x];

      if (polygon.values_.type === 'main')
        availableArea += polygon.values_.area;
      else
        excludedArea += polygon.values_.area;
    }

    const final = Math.max(0, availableArea - excludedArea) * this.maxDensityPVRoof;

    document.getElementById('full_area').value = availableArea;
    document.getElementById('excluded_area').value = excludedArea;
    document.getElementById('max_density').value = this.maxDensityPVRoof;
    document.getElementById('clear_area').value = final;
    document.getElementById('num_pv').value = Math.floor(final / this.avgPvArea);

    // document.getElementById('area-all').innerHTML =
    //   'All: ' + availableArea + '<br />' +
    //   'Excluded: ' + excludedArea + '<br />' +
    //   'Max density: ' + this.maxDensityPVRoof + '<br />' +
    //   'Clear: ' + final + '<br />' +
    //   'Number of PV: ' + Math.floor(final / this.avgPvArea);

    //console.log("Clear: " + availableArea);
  }

  /**
   *
   * @param feature
   */
  addPolygon(feature) {
    const uuid = uuidv4();

    feature.setId(uuid);
    feature.setProperties({
      type: this.getSelectedPolygonType(),
      roof: this.getSelectedRoofType(),
      area: this.getAreaPolygon(feature.getGeometry()),
    });

    let style = new Style({
      stroke: new Stroke({
        color: this.getSelectedPolygonType() === 'main' ? '#000000' : '#cc0000',
        width: 2,
      }),
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.2)',
      }),
    });

    feature.setStyle(style);

    this.polygons[uuid] = feature;

    this.calcPVArea();
  }

  /**
   *
   * @returns {*}
   */
  getSelectedPolygonType() {
    return document.getElementById('type').value;
  }

  /**
   *
   * @returns {*}
   */
  getSelectedRoofType() {
    return document.getElementById('roof').value;
  }

}

export default AreaPV;