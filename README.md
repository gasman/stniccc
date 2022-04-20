# stniccc

An abortive attempt at processing [the 2D polygon data from STNICCC 2000](http://arsantica-online.com/st-niccc-competition/) into a coherent 3D scene, abandoned when [PICONICC](https://www.pouet.net/prod.php?which=87735) beat me to it.

To run: `npm run start` then visit http://localhost:3000/ and open the JS console. Tested on Node 12.

## Usage (as far as I can remember)

Click 'Load' to load the scene data. This will let you browse through frames, and drill down to an individual polygon or vertex within a frame.

A 'PolyPath' is a sequence of per-frame polygons that have been determined to all correspond to the same polygon of the 3D scene. A 'VertexPath' is the same, but for a vertex. On initial load, every polygon and vertex of every frame is in a single-element PolyPath / VertexPath of its own. The goal is to merge these as much as possible - once this has been done fully, the graph of relations between PolyPaths and VertexPaths should hopefully be a topological representation of the scene (at which point the next step would have been to reverse-transform the vertex paths into a camera path, and then into 3D coordinates, but I didn't get that far).

'Match poly' locates the polygon in the second set of listboxes which most closely matches the one selected in the first set, based on overlap in 2D space. 'Match frame polys' does this in bulk, for every pair of consecutive frames, and merges polyPaths where they match within a certain threshold.

'Follow vertices' constructs VertexPaths by checking successive frame-polygons in a PolyPath, making a mapping between the closest-by-distance vertices in those polygons, and merging VertexPaths whenever this results in an unambiguous 1:1 mapping.

'Merge vertex paths' finds VertexPaths that exactly coincide on at least 5 frames, and merges them.

'Find vpaths by alias' merges VertexPaths by doing... something to do with their topological position relative to PolyPaths. You'd better look at the source code :-)

'Snapshot' dumps the VertexPath / PolyPath data as JSON, for some reason I forget.


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `yarn build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
