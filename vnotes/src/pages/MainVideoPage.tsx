import { Link } from "react-router-dom";
function MainVideoPage() {
    return (
        <div>
            <h1>Main Video Page</h1>
            <ul>
                <li>
                    <Link to="/videos/1">Video 1</Link>
                </li>
                <li>
                    <Link to="/videos/2">Video 2</Link>
                </li>
                <li>
                    <Link to="/videos/3">Video 3</Link>
                </li>
            </ul>
        </div>
    );
}

export default MainVideoPage;
