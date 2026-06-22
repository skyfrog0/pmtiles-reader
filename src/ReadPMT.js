const {NodeFileSource} = require("./pmtiles-node-file-source.js");
const {patchPMTiles} = require("./pmtiles-patch.js");
const {PMTiles} = patchPMTiles(); // 应用补丁并获取 PMTiles
const pmtjs = require("pmtiles");
const path = require("path");
const VectorTile = require('@mapbox/vector-tile').VectorTile;
const Pbf = require('pbf');
const zlib = require('zlib');
const util = require('util');

function parseMVTtoJSON(tileData) {
    try {
        // 验证数据是否为有效的 PBF 格式
        if (tileData.length < 2) {
            throw new Error("数据太短，不是有效的 PBF 格式");
        }

        // 创建 PBF 实例
        const pbf = new Pbf(tileData);
        // 解析矢量瓦片
        const tile = new VectorTile(pbf);

        // 构建 JSON 结果
        const result = {
            layers: {}
        };

        // 遍历所有图层
        for (const layerName in tile.layers) {
            const layer = tile.layers[layerName];
            const features = [];

            // 遍历图层中的所有要素
            for (let i = 0; i < layer.length; i++) {
                const feature = layer.feature(i);

                // 提取要素信息
                const featureJson = {
                    type: 'Feature',
                    geometry: feature.loadGeometry(),
                    properties: {}
                };
                // 提取属性
                for (const key in feature.properties) {
                    featureJson.properties[key] = feature.properties[key];
                }

                features.push(featureJson);
            }

            result.layers[layerName] = {
                version: layer.version,
                name: layer.name,
                extent: layer.extent,
                length: layer.length,
                features: features
            };
        }

        return result;
    } catch (error) {
        console.error("解析 MVT 瓦片时出错:", error.message);
        console.error("数据长度:", tileData.length, "bytes");
        console.error("数据头:", Array.from(tileData.slice(0, Math.min(20, tileData.length))).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
        throw error;
    }
}

async function parseMVT(mvtTileData) {
    let tileData = mvtTileData;
    console.log("瓦片数据大小:", tileData.byteLength, "bytes");

    // 尝试检测是否为 gzip 压缩
    if (mvtTileData[0] === 0x1f && mvtTileData[1] === 0x8b) {
        console.log("检测到 gzip 压缩，尝试解压...");
        try {
            const decompressed = zlib.gunzipSync(mvtTileData);
            console.log("解压后大小:", decompressed.length, "bytes");
            // 使用解压后的数据
            tileData = decompressed;
        } catch (e) {
            console.error("gzip 解压失败:", e.message);
            return null;
        }
    }

    // 解析为 JSON
    const jsonResult = parseMVTtoJSON(tileData);

    // 统计信息
    const layerCount = Object.keys(jsonResult.layers).length;
    let featureCount = 0;
    for (const layerName in jsonResult.layers) {
        featureCount += jsonResult.layers[layerName].features.length;
    }
    console.log(`解析成功: ${layerCount} 个图层, ${featureCount} 个要素`);

    //console.log("\n瓦片内容：")
    //console.log(util.inspect(jsonResult, {depth: 5, colors: true, compact: true}));
}

(async () => {
    const filePath = path.resolve(__dirname, "../res/g3857.pmtiles");

    const filesrc = new NodeFileSource(filePath);
    const PMT = new PMTiles(filesrc);

    // 提取Header和Root Dictionary
    const pmtHeader = await PMT.getHeader();
    let pmtDicts;
    let i = 0;
    for (const [k, v] of PMT.cache.cache) {
        console.log(`${k}: ${v}`);
        i++;
        if (i === 2) {
            pmtDicts = await v.data;
            break;
        }
    }

    // TileID 提取 XYZ
    pmtDicts.map((entry) => {
        const tileID = entry.tileId;
        const zxy = pmtjs.tileIdToZxy(tileID);
        //console.log(xyz);
        //entry.ZXY=`${zxy[0]}_${zxy[1]}_${zxy[2]}`;
        entry.zxy = zxy;
    })

    // 使用 util.inspect 控制输出格式

    console.log('\n=== PMT Header ===');
    console.log(util.inspect(pmtHeader, {depth: null, colors: true, compact: false}));
    console.log('\n=== PMT Dicts ===');
    console.log(util.inspect(pmtDicts, {depth: null, colors: true, compact: true}));

    // 获取瓦片
    console.log('\n=== PMT 获取瓦片 ===');
    console.log("\n正在获取瓦片 z=7, x=104, y=55...");
    const tileResult = await PMT.getZxy(7, 104, 55);
    if (!tileResult) {
        console.log("瓦片不存在");
        return null;
    }
    const buffer = Buffer.from(tileResult.data);
    await parseMVT(buffer);


    console.log("\n读取PMT所有瓦片");
    for (const dict in pmtDicts) {
        const [z, x, y] = pmtDicts[dict].zxy;
        console.log(`\n\n正在获取瓦片 z=${z}, x=${x}, y=${y}...`);
        const tileResult = await PMT.getZxy(z, x, y);
        await parseMVT(tileResult.data);
    }

})();
