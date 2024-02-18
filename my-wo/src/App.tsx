import React, { useEffect } from 'react';
import sample from './assets/sample.jpg';
import './App.css';
import { MarkerArea } from './components/markers';

function App() {
  function showMarkerArea(target: HTMLImageElement) {
    console.log('1')
    const markerArea = new MarkerArea(target);
    markerArea.addEventListener(
      "render",
      (event) => (target.src = event.dataUrl)
    );
    markerArea.show();
  }
  function init() {
    const sampleImage = document.getElementById("sampleImage") as HTMLImageElement;
      sampleImage.addEventListener("click", () => {
        showMarkerArea(sampleImage);
      });
  }
  useEffect(() => {
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div id="app1">
      <img alt="Vue logo" src={sample} id="sampleImage" />
    </div>
  );
}

export default App;
