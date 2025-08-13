import { Link, Outlet } from "react-router-dom";

function Layout() {
    return (
        <div>
            <nav>
                <Link to="/">Home</Link>
                <Link to="/videos">Videos</Link>
                <Link to="/notes">Notes</Link>
            </nav>
            <main>
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
