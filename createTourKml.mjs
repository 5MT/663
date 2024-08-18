import { promises as fs } from 'fs';
import xml2js from 'xml2js';
import xmlbuilder from 'xmlbuilder';

const R = 6378137; // 地球の半径 (メートル)
const durationToStartPointSec = 30; // ツアー開始から開始点に行くまでの秒数

// コマンドライン引数から JSON ファイルのパスを取得
const receipeFile = process.argv[2]; // 第一引数が JSON ファイルのパス

if (!receipeFile) {
    console.error('Usage: node createTourKml.js <receipe_json_file>');
    process.exit(1);
}

let config;
fs.readFile(receipeFile, "utf8")
.then((readFile)=>{
  // 設定ファイルを JSON パース
  config = JSON.parse(readFile);
  return;
})
.then(()=>{
  return fs.readFile(config.pathKmlFilename);
})
.then((readFile)=>{
  return xml2js.parseStringPromise(readFile);
})
.then((parsedXml)=>{
  // 座標部分の文字列をを取り出す
  const coordinatesString = parsedXml.kml.Document[0].Placemark[0].LineString[0].coordinates[0];
  
  // まず座標を "軽度, 緯度, 標高" という文字列の配列に直し、
  const coordinates = coordinatesString.trim().split(/\s+/)
    .map(coordinate => {
      // ここで "軽度, 緯度, 標高" の文字列を、[軽度, 緯度, 標高] という配列に置き換える
      return coordinate.split(',').map(Number);
    });
  return coordinates;
})
.then((coordinates)=>{

  const tourpath = coordinates.map((currentValue, index, array)=>{
  
    const previousValue = (index > 0) ? array[index - 1] : null;
    const nextValue = (index < array.length - 1) ? array[index + 1] : null;

    // カメラ heading 方角の計算
    const headingDegree = (180 / Math.PI) * ((previousValue == null) ?
      Math.PI - Math.atan2(
        nextValue[1]-currentValue[1],
        (nextValue[0]-currentValue[0]) * Math.cos(Math.PI /180 * currentValue[1])
      )
      : (nextValue != null) ?
        1/2 * (
          Math.PI - Math.atan2(
            nextValue[1]-currentValue[1],
            (nextValue[0]-currentValue[0]) * Math.cos(Math.PI /180 * currentValue[1])
          )
          - Math.atan2(
            previousValue[1]-currentValue[1],
            (previousValue[0]-currentValue[0]) * Math.cos(Math.PI /180 * currentValue[1])
          )
        )
      : -1 * Math.atan2(
        previousValue[1]-currentValue[1],
        (previousValue[0]-currentValue[0]) * Math.cos(Math.PI /180 * currentValue[1])
      )
    );

    // 指定点までの移動時間の計算
    let durationSec;
    if (!previousValue){
      durationSec = durationToStartPointSec;
    } else {
      // 緯度と経度の差をラジアンに変換
      const dLat = (currentValue[1]-previousValue[1]) * Math.PI / 180;
      const dLon = (currentValue[0]-previousValue[0]) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(previousValue[1] * Math.PI / 180) * Math.cos(currentValue[1] * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c; // メートルでの距離
      durationSec = distance / (config.tourRunningSpeedKmH * 1000 / 3600);
    }

    return [currentValue[0], currentValue[1], currentValue[2], headingDegree, durationSec];
  }); // map()

  console.log(tourpath);

  const kml = xmlbuilder.create('kml', { version: '1.0', encoding: 'UTF-8' })
    .att('xmlns', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    .att('xmlns:kml', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:atom', 'http://www.w3.org/2005/Atom')
    .ele('gx:Tour')
      .ele('name', config.tourName).up()
      .ele("gx:Playlist")
        .ele("gx:horizFov", config.gexHorizontalFieidOfViewDegree).up();

  tourpath.forEach((item, index) => {
        const flyToElement = kml.ele('gx:FlyTo')
          .ele('gx:duration', item[4]).up();

        if (index !== 0) {
          flyToElement.ele('gx:flyToMode', 'smooth').up();
        }

          flyToElement.ele('LookAt')
            .ele('longitude', item[0]).up()
            .ele('latitude', item[1]).up()
            .ele('heading', item[3]).up()
            .ele('gx:altitudeMode', config.gexAltitudeMode).up()
            .ele('altitude', config.geTagetAltitude).up()
            .ele('tilt', 0).up() // 仰角 0
            .ele('range', config.geCameraRangeDistanceMeter).up() // range は対象からカメラまでの距離 [m]
          .up();
  });

  const kmlString = kml.end({ pretty: true });

  return(fs.writeFile(config.tourKmlFilename, kmlString));
})
.then(()=>{
  console.log('KML file written successfully');
})
.catch((err)=>{
  console.error('Error :', err);
});
