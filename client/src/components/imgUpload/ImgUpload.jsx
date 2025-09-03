import React, { useState, useRef } from "react";
import "./imgUpload.module.css"; // או אם זה CSS Module: import styles from './uploadImg.module.css';

const ImgUpload = ({ onImageUploaded }) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files[0]) {
      setError("Please select a file first");
      return;
    }

    const file = fileInput.files[0];
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("http://localhost:5000/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Upload failed");
      }

      setPreview(null);
      fileInputRef.current.value = "";

      if (onImageUploaded) {
        onImageUploaded(result.filePath);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="upload-container">
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        ref={fileInputRef}
        style={{ display: "none" }}
      />
      <div className="upload-area" onClick={() => fileInputRef.current.click()}>
        {preview ? (
          <img src={preview} alt="Preview" className="preview-image" />
        ) : (
          <div className="upload-placeholder">
            <p>Choose Image</p>
          </div>
        )}
      </div>
      <button
        onClick={handleUpload}
        disabled={uploading || !preview}
        className={`upload-button ${uploading ? "uploading" : ""}`}
      >
        {uploading ? "Uploading..." : "Upload Image"}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default ImgUpload;
