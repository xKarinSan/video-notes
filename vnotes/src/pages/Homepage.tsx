import AddNewVideo from "../components/AddNewVideo";

function Homepage() {
    return (
        <div className="p-5">
            <h1 className="text-3xl font-bold mb-4">🎉 Welcome to VNotes!</h1>
            <p className="text-white-500 mb-6">
                Start by adding a new video below to create notes and snapshots.
            </p>

            <AddNewVideo />
        </div>
    );
}

export default Homepage;
