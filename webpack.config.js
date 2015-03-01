module.exports = {
	entry: './app.jsx',
	output: {
		filename: './build/bundle.js'
	},
	module: {
		loaders: [{
			test: /\.jsx$/,
			loader: 'jsx-loader'
		}]
	},
	resolve: {
		extensions: ['', '.js', '.jsx'],
		modulesDirectories: ['src', 'web_modules', 'node_modules']
	}
};