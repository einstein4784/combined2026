const { series, src, dest, parallel, watch } = require("gulp");
const autoprefixer = require("gulp-autoprefixer");
const browsersync = require("browser-sync");
const concat = require("gulp-concat");
const CleanCSS = require("gulp-clean-css");
const del = require("del");
const fileinclude = require("gulp-file-include");
const npmdist = require("gulp-npm-dist");
const newer = require("gulp-newer");
const rename = require("gulp-rename");
const rtlcss = require("gulp-rtlcss");
const sourcemaps = require("gulp-sourcemaps");
const sass = require("gulp-sass")(require("sass"));
const uglify = require("gulp-uglify");

const paths = {
    baseSrc: "src/",
    baseDist: "dist/",
    baseDistAssets: "dist/assets/",
    baseSrcAssets: "src/assets/",
};

const clean = function (done) {
    del.sync(paths.baseDist, done());
};

const vendor = function () {
    const vendorout = paths.baseDistAssets + "js/";
    src([
        "./node_modules/jquery/dist/jquery.min.js",
        "./node_modules/bootstrap/dist/js/bootstrap.bundle.min.js",
        "./node_modules/simplebar/dist/simplebar.min.js",
        "./node_modules/node-waves/dist/waves.min.js",
        "./node_modules/lucide/dist/umd/lucide.min.js",
    ])
        .pipe(concat("vendor.js"))
        .pipe(uglify())
        .pipe(rename({ suffix: ".min" }))
        .pipe(dest(vendorout));

    const libsout = paths.baseDistAssets + "libs/";
    return src(npmdist(), { base: "./node_modules" })
        .pipe(rename(function (path) {
            path.dirname = path.dirname.replace(/\/dist/, '').replace(/\\dist/, '');
        }))
        .pipe(dest(libsout));
};

const html = function () {
    const srcPath = paths.baseSrc + "/";
    const out = paths.baseDist;
    return src([
        srcPath + "*.html",
        srcPath + "*.ico",
        srcPath + "*.png",
    ])
        .pipe(
            fileinclude({
                prefix: "@@",
                basepath: "@file",
                indent: true,
            })
        )
        .pipe(dest(out));
};

const data = function () {
    const out = paths.baseDistAssets + "data/";
    return src([paths.baseSrcAssets + "data/**/*"])
        .pipe(dest(out));
};

const fonts = function () {
    const out = paths.baseDistAssets + "fonts/";
    return src([paths.baseSrcAssets + "fonts/**/*"])
        .pipe(newer(out))
        .pipe(dest(out));
};

const images = function () {
    var out = paths.baseDistAssets + "images";
    return src(paths.baseSrcAssets + "images/**/*")
        .pipe(newer(out))
        .pipe(dest(out));
};

const javascript = function () {
    const out = paths.baseDistAssets + "js/";

    return src(paths.baseSrcAssets + "js/**/*.js")
        .pipe(uglify())
        .pipe(dest(out));
};


const scss = function () {
    const out = paths.baseDistAssets + "css/";

    src([paths.baseSrcAssets + "scss/**/*.scss", '!' + paths.baseSrcAssets + "scss/icons.scss"])
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));

    // generate rtl
    return src([paths.baseSrcAssets + "scss/**/*.scss", '!' + paths.baseSrcAssets + "scss/icons.scss"])
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(rtlcss())
        .pipe(rename({ suffix: "-rtl" }))
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));
};


const icons = function () {
    const out = paths.baseDistAssets + "css/";
    return src(paths.baseSrcAssets + "scss/icons.scss")
        .pipe(sourcemaps.init())
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(
            autoprefixer({
                overrideBrowserslist: ["last 2 versions"],
            })
        )
        .pipe(dest(out))
        .pipe(CleanCSS())
        .pipe(rename({ suffix: ".min" }))
        .pipe(sourcemaps.write("./"))
        .pipe(dest(out));
};


// live browser loading
const initBrowserSync = function (done) {
    const startPath = "/index.html";
    browsersync.init({
        startPath: startPath,
        server: {
            baseDir: paths.baseDist,
            middleware: [
                function (req, res, next) {
                    req.method = "GET";
                    next();
                },
            ],
        },
    });
    done();
}

const reloadBrowserSync = function (done) {
    browsersync.reload();
    done();
}

function watchFiles() {
    watch(paths.baseSrc + "**/*.html", series(html, reloadBrowserSync));
    watch(paths.baseSrcAssets + "data/**/*", series(data, reloadBrowserSync));
    watch(paths.baseSrcAssets + "fonts/**/*", series(fonts, reloadBrowserSync));
    watch(paths.baseSrcAssets + "images/**/*", series(images, reloadBrowserSync));
    watch(paths.baseSrcAssets + "js/**/*", series(javascript, reloadBrowserSync));
    watch(paths.baseSrcAssets + "scss/icons.scss", series(icons, reloadBrowserSync));
    watch([paths.baseSrcAssets + "scss/**/*.scss", "!" + paths.baseSrcAssets + "scss/icons.scss", "!" + paths.baseSrcAssets + "scss/icons/*.scss"], series(scss, reloadBrowserSync));
}

// Producaton
exports.default = series(
    html,
    vendor,
    parallel(data, fonts, images, javascript, scss, icons),
    parallel(watchFiles, initBrowserSync)
);

// Build
exports.build = series(
    clean,
    html,
    vendor,
    parallel(data, fonts, images, javascript, scss, icons)
);