function AddNewVideo() {
    function addVideo() {
        alert("Video added!");
    }
    return (
        <div>
            <div class="card bg-base-100 w-96 shadow-sm m-auto">
                <div class="card-body">
                    <h2 class="card-title">Add New Video</h2>
                    <p>
                        <input
                            type="text"
                            placeholder="Type here"
                            class="input"
                        />
                        <button
                            class="btn btn-primary m-auto"
                            onClick={() => addVideo()}
                        >
                            Add Video
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AddNewVideo;
