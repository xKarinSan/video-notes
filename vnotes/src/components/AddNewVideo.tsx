import { useState } from "react";

function AddNewVideo() {
    const [videoUrl, setVideoURL] = useState("");
    function addVideo() {
        console.log(videoUrl);
        window.api.getVideodata(videoUrl);
        alert("Video added!");
    }
    return (
        <div>
            <div className="card bg-base-300 w-96 shadow-sm m-auto ">
                <div className="card-body">
                    <h2 className="card-title">Add New Video</h2>
                    <p>
                        <input
                            type="text"
                            placeholder="Type here"
                            className="input w-full"
                            onChange={(e) => setVideoURL(e.target.value)}
                            value={videoUrl}
                        />
                        <button
                            className="btn btn-base-content m-auto w-full"
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
