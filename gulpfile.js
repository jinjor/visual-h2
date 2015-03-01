var gulp = require('gulp');
var react = require('gulp-react');

gulp.task('build', function(cb) {
	return gulp.src('./src/**/*.*')
		.pipe(react())
		.pipe(gulp.dest('build'));
});

gulp.task('watch', function(cb) {

});