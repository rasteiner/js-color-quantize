
function rgbToHue(r, g, b) {
  const r1 = r / 255;
  const g1 = g / 255;
  const b1 = b / 255;
  const cmax = Math.max(r1, g1, b1);
  const cmin = Math.min(r1, g1, b1);
  const delta = cmax - cmin;

  let hue = 0;
  if (delta == 0) {
    hue = 0;
  } else if (cmax == r1) {
    hue = (g1 - b1) / delta;
  } else if (cmax == g1) {
    hue = 2 + (b1 - r1) / delta;
  } else if (cmax == b1) {
    hue = 4 + (r1 - g1) / delta;
  }

  hue *= 60;
  if (hue < 0) {
    hue += 360;
  }

  return hue;
}

function absAngleDistance(a, b) {
  const diff = Math.abs(a - b);
  return diff > 180 ? 360 - diff : diff;
}

//returns the point in the data that is furthest away from all the other points
function furthestPoint(points, data) {
  let maxDistance = 0;
  let maxIndex = 0;

  for(let i = 0; i < data.length; i += 3) {
    let distance = 0
    for(let p of points) {
      distance += absAngleDistance(rgbToHue(data[i], data[i + 1], data[i + 2]), rgbToHue(p[0], p[1], p[2]));
    }

    if(distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  return [data[maxIndex], data[maxIndex + 1], data[maxIndex + 2]];
}

function generateClusters(k, data) {
  /*

  //randomly generate k centroids
  const centroids = [];

  for (let i = 0; i < k; i++) {
    centroids.push([
      Math.random() * 255,
      Math.random() * 255,
      Math.random() * 255,
    ]);
  }

  */

  //pick a random pixel
  const numPixels = data.length / 4;
  const randomPixel = Math.floor(Math.random() * numPixels);
  const color = [
    data[randomPixel],
    data[randomPixel + 1],
    data[randomPixel + 2],
  ];

  const centroids = [color];
  for (let i = 1; i < k; i++) {
    centroids.push(furthestPoint(centroids, data));
  }

  let clusters;

  for (let iteration = 0; iteration < 50; iteration++) {
    //create a new array to store the clusters
    clusters = [];

    //for each pixel in the image, find the closest centroid
    for (let i = 0; i < data.length; i += 4) {
      let min = Infinity;
      let minIndex = 0;
      for (let j = 0; j < centroids.length; j++) {
        const dist = Math.sqrt(
          Math.pow(data[i] - centroids[j][0], 2) +
            Math.pow(data[i + 1] - centroids[j][1], 2) +
            Math.pow(data[i + 2] - centroids[j][2], 2)
        );
        if (dist < min) {
          min = dist;
          minIndex = j;
        }
      }
      //add the pixel to the cluster
      if (!clusters[minIndex]) {
        clusters[minIndex] = [];
      }
      clusters[minIndex].push(i);
    }

    let changeDistance = 0;

    //for each cluster, find the average color
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      if (!cluster) {
        continue;
      }
      const r = [];
      const g = [];
      const b = [];
      for (let j = 0; j < cluster.length; j++) {
        r.push(data[cluster[j]]);
        g.push(data[cluster[j] + 1]);
        b.push(data[cluster[j] + 2]);
      }
      const avgR = r.reduce((a, b) => a + b) / r.length;
      const avgG = g.reduce((a, b) => a + b) / g.length;
      const avgB = b.reduce((a, b) => a + b) / b.length;

      //if the centroid has moved, update it
      const oldCentroid = centroids[i];
      const newCentroid = [avgR, avgG, avgB];
      changeDistance += Math.sqrt(
        Math.pow(oldCentroid[0] - newCentroid[0], 2) +
          Math.pow(oldCentroid[1] - newCentroid[1], 2) +
          Math.pow(oldCentroid[2] - newCentroid[2], 2)
      );
      centroids[i] = newCentroid;
    }

    //if the centroids have converged, stop
    if (changeDistance < 0.5) {
      break;
    }
  }

  return [centroids, clusters];
}

function getVariance(data, centroids, clusters) {
  let total = 0;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const centroid = centroids[i];

    if(!cluster) {
      total += 1000;
      continue;
    }

    let distance = 0;
    //for each point in cluster
    for (let j = 0; j < cluster.length; j++) {
      const point = cluster[j];
      distance += Math.sqrt(
        Math.pow(data[point] - centroid[0], 2) +
        Math.pow(data[point + 1] - centroid[1], 2) +
        Math.pow(data[point + 2] - centroid[2], 2)
      );
    }
    total += distance / cluster.length;
  }

  return total;
}

function send(clusters, centroids, variance) {
  postMessage(
    [
      centroids.filter((_, i) => clusters[i] && clusters[i].length),
      variance,
    ]
  );
}

onmessage = function (e) {
  const [k, data] = e.data;

  let bestVariance = Infinity;
  let bestClusters;
  let bestCentroids;
  
  for(let i = 0; i < 2; i++) {
    const [centroids, clusters] = generateClusters(k, data);
    const variance = getVariance(data, centroids, clusters);

    if(variance < bestVariance) {
      bestVariance = variance;
      bestClusters = clusters;
      bestCentroids = centroids;
    }
    
  }
  send(bestClusters, bestCentroids, bestVariance);
  
};
