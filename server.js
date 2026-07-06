const express = require("express");

const multer = require("multer");

const { encodeVideo } =
require("./encoder");

const app = express();

const upload = multer({
    dest: "uploads/"
});

app.use(express.static("public"));

app.post(

    "/upload",

    upload.single("video"),

    async (req, res) => {

        try {

            const data =
            await encodeVideo(
                req.file.path
            );

            res.send(data);

        }

        catch (err) {

            console.error(err);

            res.status(500)
            .send("Encoder error");

        }

    }

);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );

});
