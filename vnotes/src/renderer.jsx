import React from "react";
import { createRoot } from "react-dom/client";
// document.body.innerHTML = '<div id="app"></div>'

// const root = createRoot(document.getElementById('app'));
// root.render(<h1>Hello world</h1>);
const App = () => {
    return <h1> Hello from React =) </h1>;
};

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<App />);
