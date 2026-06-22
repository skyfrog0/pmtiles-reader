
/**
 * 将 Buffer 数据转换为十六进制字符串
 * @param {Buffer} tileData - 瓦片的 Buffer 数据
 * @param {Object} [options] - 可选配置
 * @param {number} [options.bytesPerLine=16] - 每行显示的字节数
 * @param {boolean} [options.showAscii=true] - 是否显示 ASCII 列
 * @param {number} [options.maxBytes] - 最大转换字节数（用于大数据截断）
 * @returns {string} 格式化后的十六进制字符串
 */
function toHexString(tileData, options = {}) {
    const {
        bytesPerLine = 16,
        showAscii = true,
        maxBytes
    } = options;

    const buffer = Buffer.isBuffer(tileData) ? tileData : Buffer.from(tileData);
    const length = maxBytes ? Math.min(buffer.length, maxBytes) : buffer.length;
    const lines = [];

    // 添加头部信息
    lines.push(`Total size: ${buffer.length} bytes`);
    if (maxBytes && buffer.length > maxBytes) {
        lines.push(`Showing first ${length} bytes (truncated from ${buffer.length})`);
    }
    lines.push('');

    for (let i = 0; i < length; i += bytesPerLine) {
        const chunk = buffer.slice(i, i + bytesPerLine);
        const hexValues = [];
        const asciiValues = [];

        // 转换为十六进制和 ASCII
        for (let j = 0; j < bytesPerLine; j++) {
            if (j < chunk.length) {
                const byte = chunk[j];
                hexValues.push(byte.toString(16).padStart(2, '0'));
                // ASCII: 只显示可打印字符 (32-126)
                asciiValues.push(byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.');
            } else {
                hexValues.push('  '); // 填充空格
            }
        }

        // 格式化输出
        const offset = i.toString(16).padStart(8, '0').toUpperCase();
        const hexPart = hexValues.join(' ');
        const asciiPart = showAscii ? ` |${asciiValues.join('')}|` : '';

        lines.push(`${offset}  ${hexPart}${asciiPart}`);
    }

    return lines.join('\n');
}


module.exports = { toHexString };