import { Link } from "react-router-dom";
function MainNotesPage() {
    return (
        <div>
            <h1>Main Notes page</h1>
            <ul>
                <li>
                    <Link to="/notes/1">Note 1</Link>
                </li>
                <li>
                    <Link to="/notes/2">Note 2</Link>
                </li>
                <li>
                    <Link to="/notes/3">Note 3</Link>
                </li>
            </ul>
        </div>
    );
}

export default MainNotesPage;
