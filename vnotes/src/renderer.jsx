import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Layout from "./Layout";
import Homepage from "./pages/Homepage";
import MainNotesPage from "./pages/MainNotesPage";
import CurrentNotesPage from "./pages/CurrentNotesPage";
import MainVideoPage from "./pages/MainVideoPage";
import CurrentVideoPage from "./pages/CurrentVideoPage";

import "./index.css";

const router = createBrowserRouter([
    {
        element: <Layout />,
        children: [
            {
                path: "/",
                element: <Homepage />,
            },
            {
                path: "/videos",
                element: <MainVideoPage />,
            },
            {
                path: "/videos/:videoId",
                element: <CurrentVideoPage />,
            },
            {
                path: "/notes",
                element: <MainNotesPage />,
            },
            {
                path: "/notes/:notesId",
                element: <CurrentNotesPage />,
            },
        ],
    },
]);

const container = document.getElementById("root");
const root = createRoot(container);
root.render(<RouterProvider router={router} />);
