import { promises as fs } from 'fs';
import xml2js from 'xml2js';

// コマンドライン引数からKMLファイルのパスを取得
const kmlFile = process.argv[2]; // 第一引数がKMLファイルのパス
const outputJsonFile = process.argv[3]; // 出力するJSONファイルのパス

if (!kmlFile || !outputJsonFile) {
    console.error('Usage: node extractCoordinatesFromPathKml.js <path_to_kml_file> [output_json_file]');
    process.exit(1);
}

fs.readFile(kmlFile, 'utf8')
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

    const outputData = {
        description: "Each coordinate is represented as [longitude, latitude, altitude]",
        coordinates: coordinates
    };

    return fs.writeFile(outputJsonFile, JSON.stringify(outputData, null, 2));
  })
  .then(() => {
      console.log(`座標データを ${outputJsonFile} に書き出しました`);
  })
  .catch(err => {
      console.error(`エラーが発生しました: ${err.message}`);
      process.exit(1);
  });
