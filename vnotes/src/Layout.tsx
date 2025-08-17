import { Link, Outlet } from "react-router-dom";

function Layout() {
    return (
        <div className="drawer sm:drawer-open">
            <input id="my-drawer-3" type="checkbox" className="drawer-toggle" />
            <div className="drawer-content flex flex-col">
                <div className="navbar bg-base-300 w-full">
                    <div className="flex-none sm:hidden">
                        <label
                            htmlFor="my-drawer-3"
                            aria-label="open sidebar"
                            className="btn btn-square btn-ghost"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                className="inline-block h-6 w-6 stroke-current"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 6h16M4 12h16M4 18h16"
                                ></path>
                            </svg>
                        </label>
                    </div>
                    <div className="mx-2 flex-1 px-2">VNotes</div>
                    <div className="hidden flex-none sm:hidden">
                        <ul className="menu menu-horizontal">
                            <li>
                                <Link to="/">Home</Link>
                            </li>
                            <li>
                                <Link to="/videos">Videos</Link>
                            </li>
                            <li>
                                <Link to="/notes">Notes</Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <Outlet />
            </div>
            <div className="drawer-side">
                <label
                    htmlFor="my-drawer-3"
                    aria-label="close sidebar"
                    className="drawer-overlay"
                ></label>
                <ul className="menu bg-base-200 min-h-full w-50 p-4">
                    <li>
                        <Link to="/">Home</Link>
                    </li>
                    <li>
                        <Link to="/videos">Videos</Link>
                    </li>
                    <li>
                        <Link to="/notes">Notes</Link>
                    </li>
                </ul>
            </div>
        </div>
    );
}

export default Layout;
