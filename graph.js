const {createCanvas} = require("canvas");

function canvasToBuffer(canvas) {
    return Buffer.from(canvas.toDataURL().substring(22), "base64");
}

// Create a graph image, returns a buffer
function graph(data, width, height, stops = 25) {
    let canvas = createCanvas(width, height),
        ctx = canvas.getContext("2d");

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    let mar = 10, marLeft = 30;

    let max = data.reduce((a, max) => (a > max ? a : max), 0);

    // Style for graph
    ctx.fillStyle = "rgba(255, 255, 107, 0.75)";

    // Draw graph
    ctx.beginPath();
    ctx.moveTo(width - mar, height - mar);
    ctx.lineTo(marLeft, height - mar);

    let len = data.length;

    for (let i = 0; i < len; i++) {
        ctx.lineTo(
            ((width - mar - marLeft) / (len - 1)) * i + marLeft,
            height - mar - data[i] * ((height - 2 * mar) / max)
        );
    }
    ctx.fill();

    // Style for axes
    ctx.strokeStyle = ctx.fillStyle = "white";
    ctx.lineWidth = 2;
    ctx.font = "normal bold 12px Arial";

    // Draw axes
    ctx.beginPath();
    ctx.moveTo(marLeft, mar);
    ctx.lineTo(marLeft, height - mar);
    ctx.lineTo(width - mar, height - mar);

    // Draw graduations
    for (let i = 0; i <= max; i += stops) {
        let y = height - mar - i * ((height - 2 * mar) / max);

        ctx.moveTo(marLeft - 3, y);
        ctx.lineTo(marLeft + 3, y);

        ctx.fillText("" + i, marLeft - 6, y);
    }

    ctx.stroke();

    return canvasToBuffer(canvas);
}

module.exports = graph;