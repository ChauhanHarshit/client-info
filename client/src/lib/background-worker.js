/**
 * Background Worker for Processing Heavy Tasks
 * Handles CPU-intensive operations without blocking the main thread
 */

self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'imageResize':
        result = resizeImage(data);
        break;
      case 'videoThumbnail':
        result = generateVideoThumbnail(data);
        break;
      case 'dataProcessing':
        result = processLargeDataSet(data);
        break;
      case 'textAnalysis':
        result = analyzeText(data);
        break;
      case 'compression':
        result = compressData(data);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    
    self.postMessage({ success: true, result });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};

function resizeImage(data) {
  // Image resizing logic
  const { imageData, width, height } = data;
  
  // Create canvas for resizing
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Resize image
  ctx.drawImage(imageData, 0, 0, width, height);
  
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
}

function generateVideoThumbnail(data) {
  // Video thumbnail generation
  const { videoBlob, timestamp } = data;
  
  // This would use OffscreenCanvas to generate thumbnail
  // For now, return placeholder
  return { thumbnail: 'placeholder-thumbnail-data' };
}

function processLargeDataSet(data) {
  // Process large datasets
  const { items, operation } = data;
  
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    
    switch (operation) {
      case 'filter':
        if (item.active) results.push(item);
        break;
      case 'transform':
        results.push({
          ...item,
          processed: true,
          timestamp: Date.now()
        });
        break;
      case 'aggregate':
        // Aggregation logic
        break;
    }
    
    // Report progress every 100 items
    if (i % 100 === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / items.length) * 100
      });
    }
  }
  
  return results;
}

function analyzeText(data) {
  // Text analysis logic
  const { text, analysis } = data;
  
  const result = {
    wordCount: text.split(/\s+/).length,
    characterCount: text.length,
    sentiment: 'neutral' // Placeholder
  };
  
  if (analysis.includes('keywords')) {
    result.keywords = extractKeywords(text);
  }
  
  if (analysis.includes('readability')) {
    result.readability = calculateReadability(text);
  }
  
  return result;
}

function extractKeywords(text) {
  // Simple keyword extraction
  const words = text.toLowerCase().split(/\s+/);
  const frequency = {};
  
  words.forEach(word => {
    if (word.length > 3) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  return Object.entries(frequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

function calculateReadability(text) {
  // Simple readability calculation
  const sentences = text.split(/[.!?]+/).length;
  const words = text.split(/\s+/).length;
  const averageWordsPerSentence = words / sentences;
  
  return {
    averageWordsPerSentence,
    complexity: averageWordsPerSentence > 20 ? 'high' : averageWordsPerSentence > 15 ? 'medium' : 'low'
  };
}

function compressData(data) {
  // Data compression logic
  const { content, algorithm } = data;
  
  switch (algorithm) {
    case 'gzip':
      return compressGzip(content);
    case 'lz4':
      return compressLZ4(content);
    default:
      return compressSimple(content);
  }
}

function compressGzip(content) {
  // Placeholder for gzip compression
  return { compressed: btoa(content), ratio: 0.7 };
}

function compressLZ4(content) {
  // Placeholder for LZ4 compression
  return { compressed: btoa(content), ratio: 0.6 };
}

function compressSimple(content) {
  // Simple compression by removing whitespace
  const compressed = content.replace(/\s+/g, ' ').trim();
  return { 
    compressed, 
    ratio: compressed.length / content.length 
  };
}