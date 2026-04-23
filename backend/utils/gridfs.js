const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const crypto = require('crypto');

let gridFSBucket;

// Initialize GridFS bucket
const initGridFS = (connection) => {
  try {
    // connection.db works with newer mongoose versions
    const db = connection.db || connection;
    gridFSBucket = new GridFSBucket(db, { bucketName: 'files' });
    console.log('GridFS bucket initialized successfully');
  } catch (error) {
    console.error('Failed to initialize GridFS:', error.message);
    throw error;
  }
};

// Upload file to GridFS
const uploadToGridFS = (buffer, filename, metadata = {}) => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      console.error('GridFS not initialized when upload attempted');
      return reject(new Error('GridFS bucket not initialized. Please check MongoDB connection and server logs.'));
    }
    
    if (!buffer || buffer.length === 0) {
      return reject(new Error('Empty file buffer'));
    }
    const uploadStream = gridFSBucket.openUploadStream(filename, {
      metadata: {
        ...metadata,
        uploadedAt: new Date(),
        uploadedBy: metadata.userId
      }
    });

    uploadStream.on('finish', (doc) => {
      resolve({
        fileId: doc._id,
        filename: doc.filename,
        size: doc.length,
        metadata: doc.metadata
      });
    });

    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
};

// Download file from GridFS
const downloadFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    const downloadStream = gridFSBucket.openDownloadStream(fileId);
    const chunks = [];

    downloadStream.on('data', (chunk) => {
      chunks.push(chunk);
    });

    downloadStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    downloadStream.on('error', reject);
  });
};

// Get file info from GridFS
const getFileInfo = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      return reject(new Error('GridFS not initialized. MongoDB connection may have failed.'));
    }
    gridFSBucket.find({ _id: fileId }).toArray((err, files) => {
      if (err) reject(err);
      else if (files.length === 0) reject(new Error('File not found'));
      else resolve(files[0]);
    });
  });
};

// Delete file from GridFS
const deleteFromGridFS = (fileId) => {
  return new Promise((resolve, reject) => {
    if (!gridFSBucket) {
      return reject(new Error('GridFS not initialized. MongoDB connection may have failed.'));
    }
    gridFSBucket.delete(fileId, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// Helper to check if GridFS is initialized
const isGridFSInitialized = () => !!gridFSBucket;

module.exports = {
  initGridFS,
  uploadToGridFS,
  downloadFromGridFS,
  getFileInfo,
  deleteFromGridFS,
  getGridFSBucket: () => gridFSBucket,
  isGridFSInitialized
};
