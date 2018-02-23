module.exports = {
    entry: ['babel-polyfill', './app.js'],  // babel-polyfill はIE11などで必要
    output: {
        path : __dirname,
        filename: 'bundle.js'
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                loader: 'babel-loader'  // babel でも可能
            }
        ]
    },
    devServer: {
      port: 3000
    }
};
