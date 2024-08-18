import { promises as fs } from 'fs';
import xml2js from 'xml2js';
import xmlbuilder from 'xmlbuilder';

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
    return fs.readFile(config.pathCoordinatesFilename, "utf8");
  })
  .then((readCoordinatesFile)=>{
    // 座標ファイルを JSON パース
    const coordinatesData = JSON.parse(readCoordinatesFile);

//    console.log(coordinatesData.coordinates);

    const tourpath = coordinatesData.coordinates.map((currentValue, index, array)=>{
      let previousValue = (index > 0) ? array[index - 1] : null;
      let nextValue = (index < array.length - 1) ? array[index + 1] : null;

      let headingDegree = (180 / Math.PI) * ((previousValue == null) ?
          Math.PI - Math.atan2(nextValue[1]-currentValue[1],nextValue[0]-currentValue[0])
        : (nextValue != null) ?
          1/2 * (
            Math.PI - Math.atan2(nextValue[1]-currentValue[1],nextValue[0]-currentValue[0])
            - Math.atan2(previousValue[1]-currentValue[1],previousValue[0]-currentValue[0])
          )
        : -1 * Math.atan2(previousValue[1]-currentValue[1],previousValue[0]-currentValue[0])
      );

      return [currentValue[0], currentValue[1], currentValue[2], headingDegree];
    });

//    console.log(tourpath);

    const kml = xmlbuilder.create('kml', { version: '1.0', encoding: 'UTF-8' })
    .att('xmlns', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    .att('xmlns:kml', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:atom', 'http://www.w3.org/2005/Atom')
    .ele('gx:Tour')
      .ele('name', config.tourName).up()
      .ele("gx:Playlist")
        .ele("gx:horizFov", config.gexHorizontalFieidOfViewDegree).up();

//    const playListElement = kml.ele("gx:PlayList");

    tourpath.forEach(item => {
//      playListElement.ele('gx:FlyTo')
        kml.ele('gx:FlyTo')
          .ele('gx:duration', 2).up()
          .ele('gx:flyToMode', 'smooth').up()
          .ele('LookAt')
            .ele('longitude', item[0]).up()
            .ele('latitude', item[1]).up()
            .ele('heading', item[3]).up()
            .ele('gx:altitudeMode', 'relativeToGround').up()
            .ele('altitude', 0).up()
            .ele('tilt', 0).up() // 仰角 0
            .ele('range', 40).up() // range は対象からカメラまでの距離 [m]
          .up()
    });

//    playListElement.up();

    const kmlString = kml.end({ pretty: true });

    return(fs.writeFile(config.tourFilename, kmlString));
  })
  .then(()=>{
    console.log('KML file written successfully');
  })
  .catch((err)=>{
    console.error('Error :', err);
  });


