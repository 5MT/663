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
    const coordinates = JSON.parse(readCoordinatesFile);

    console.log(coordinates.coordinates);

    const kml = xmlbuilder.create('kml', { version: '1.0', encoding: 'UTF-8' })
    .att('xmlns', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:gx', 'http://www.google.com/kml/ext/2.2')
    .att('xmlns:kml', 'http://www.opengis.net/kml/2.2')
    .att('xmlns:atom', 'http://www.w3.org/2005/Atom')
    .ele('gx:Tour')
      .ele('name', config.tourName)
      .up()
      .ele("gx:PlayList")
        .ele("gx:horizFov", config.gexHorizontalFieidOfViewDegree)
        .up()
      .up()
    .end({ pretty: true });

    console.log(kml);
  });


