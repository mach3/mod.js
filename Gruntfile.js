
module.exports = function(grunt){

	require("load-grunt-tasks")(grunt);

	var banner = grunt.template.process(
		grunt.file.read("src/banner.js"),
		{data: grunt.file.readJSON("package.json")}
	);

	var sources = [
		"src/mod.js"
	];

	grunt.initConfig({

		concat: {
			options: {
				banner: banner
			},
			dev: {
				files: {
					"dist/mod.js": sources
				}
			}
		},

		uglify: {
			options: {
				sourceMap: true,
				banner: banner
			},
			dev: {
				files: {
					"dist/mod.dev.js": sources
				}
			},
			build: {
				options: {sourceMap: false},
				files: {
					"dist/mod.min.js": sources
				}
			}
		},

		watch: {
			dev: {
				files: ["src/*.js"],
				tasks: ["uglify", "concat"]
			}
		},

		connect: {
			dev: {
				options: {
					base: ".",
					port: 8080,
					keepalive: false
				}
			}
		}

	});

	grunt.registerTask("default", []);
	grunt.registerTask("dev", ["connect:dev", "watch"]);

};