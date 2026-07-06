const fs = require("fs");
const path = require("path");

const Jimp = require("jimp");

const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");

ffmpeg.setFfmpegPath(ffmpegPath);

// =========================
// CONFIG
// =========================

const FPS = 5;

const WIDTH = 32;
const HEIGHT = 18;

const FRAME_DIR = "./frames";

// =========================
// Create folders
// =========================

if (!fs.existsSync(FRAME_DIR)) {
    fs.mkdirSync(FRAME_DIR);
}

// =========================
// Clear frames
// =========================

function clearFrames() {

    const files =
    fs.readdirSync(FRAME_DIR);

    for (const file of files) {

        fs.unlinkSync(
            path.join(FRAME_DIR, file)
        );

    }

}

// =========================
// RGB -> HEX
// =========================

function rgbToHex(r, g, b) {

    return (
        "#" +
        r.toString(16).padStart(2, "0") +
        g.toString(16).padStart(2, "0") +
        b.toString(16).padStart(2, "0")
    );

}

// =========================
// Extract frames
// =========================

function extractFrames(inputVideo) {

    return new Promise((resolve, reject) => {

        ffmpeg(inputVideo)

            .outputOptions([
                `-vf fps=${FPS},scale=${WIDTH}:${HEIGHT}:flags=neighbor`
            ])

            .output(
                path.join(
                    FRAME_DIR,
                    "frame_%04d.png"
                )
            )

            .on("end", () => {

                console.log(
                    "Frames extracted!"
                );

                resolve();

            })

            .on("error", reject)

            .run();

    });

}

// =========================
// Encode frame
// =========================

async function encodeFrame(
    file,
    previousFrame
) {

    const image =
    await Jimp.read(file);

    let data = "";

    let skipCount = 0;

    let repeatColor = null;
    let repeatCount = 0;

    const currentFrame = [];

    // =====================
    // Flush skip
    // =====================

    function flushSkip() {

        if (skipCount <= 0) return;

        data += `."${skipCount}"`;

        skipCount = 0;

    }

    // =====================
    // Flush repeat
    // =====================

    function flushRepeat() {

        if (repeatCount <= 0) return;

        if (repeatCount === 1) {

            data +=
            `c"${repeatColor}"`;

        }

        else {

            data +=
            `!"${repeatCount}""${repeatColor}"`;

        }

        repeatCount = 0;
        repeatColor = null;

    }

    // =====================
    // Pixel loop
    // =====================

    for (let y = 0; y < HEIGHT; y++) {

        for (let x = 0; x < WIDTH; x++) {

            const rgba =
            Jimp.intToRGBA(

                image.getPixelColor(x, y)

            );

            const hex =
            rgbToHex(

                rgba.r,
                rgba.g,
                rgba.b

            );

            currentFrame.push(hex);

            const index =
            y * WIDTH + x;

            // Delta skip

            if (

                previousFrame &&
                previousFrame[index] === hex

            ) {

                flushRepeat();

                skipCount++;

                continue;

            }

            flushSkip();

            // Repeat color

            if (
                repeatColor === hex
            ) {

                repeatCount++;

            }

            else {

                flushRepeat();

                repeatColor = hex;
                repeatCount = 1;

            }

        }

    }

    flushRepeat();
    flushSkip();

    return {

        encoded: data,

        frame: currentFrame

    };

}

// =========================
// MAIN ENCODER
// =========================

module.exports.encodeVideo =
async function(inputVideo) {

    clearFrames();

    await extractFrames(inputVideo);

    const files = fs.readdirSync(FRAME_DIR)

        .filter(file =>
            file.endsWith(".png")
        )

        .sort();

    let videoData = "";

    let previousFrame = null;

    let frameNumber = 0;

    for (const file of files) {

        frameNumber++;

        console.log(
            `Encoding frame ${frameNumber}/${files.length}`
        );

        const result =
        await encodeFrame(

            path.join(FRAME_DIR, file),

            previousFrame

        );

        previousFrame = result.frame;

        videoData +=
        result.encoded + "_";

    }

    return `'${FPS}''${videoData}'`;

};
