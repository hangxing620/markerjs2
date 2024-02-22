import React, { useEffect, useState } from 'react';
import sample from './assets/sample.jpg';
import './App.css';
import { MarkerArea } from './components/markers';
// function App() {
//   function showMarkerArea(target: HTMLImageElement) {
//     console.log('1')
//     const markerArea = new MarkerArea(target);
//     markerArea.addEventListener(
//       "render",
//       (event) => (target.src = event.dataUrl)
//     );
//     markerArea.show();
//   }
//   function init() {
//     const sampleImage = document.getElementById("sampleImage") as HTMLImageElement;
//     sampleImage.addEventListener("click", () => {
//       showMarkerArea(sampleImage);
//     });
//   }
//   useEffect(() => {
//     init();
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [])
//   return (
//     <div id="app1">
//       <img alt="Vue logo" src={sample} id="sampleImage" />
//     </div>
//   );
// }

import CanvasSelect from './components/canvas-select';

const option = [
  {
    label: "rect",
    labelFillStyle: "#f00",
    textFillStyle: "#fff",
    fillStyle: "rgba(130,22,220,.6)",
    coor: [
      [184, 183],
      [275, 238]
    ],
    type: 1
  },
  {
    label: "polygon",
    active: false,
    coor: [
      [135, 291],
      [129, 319],
      [146, 346],
      [174, 365],
      [214, 362],
      [196, 337],
      [161, 288]
    ],
    type: 2
  },
  {
    label: "dot",
    coor: [345, 406],
    type: 3
  },
  {
    label: "line",
    coor: [
      [456, 153],
      [489, 228],
      [492, 296]
    ],
    type: 4
  },
  {
    label: "circle",
    coor: [369, 197],
    radius: 38,
    type: 5
  }
];

function App() {

  const [instance, setInstance] = useState<CanvasSelect>();
  const [output, setOutput] = useState<HTMLTextAreaElement>(null);

  useEffect(() => {
    // setInstance(new CanvasSelect(".container",  "https://cdn.jsdelivr.net/npm/@heylight/cdn@%5E1/img/onepiece.png"))
    setInstance(new CanvasSelect(".container", sample))
    setOutput(document.getElementById("output") as HTMLTextAreaElement);

    setTimeout(() => {
      // instance.labelMaxLen = 10;
      // // @ts-ignore
      // instance.setData(option);

      instance.on('load', (src: any) => {
        instance.labelMaxLen = 10;
        // @ts-ignore
        instance.setData(option);
        console.log("image loaded", src);
      })

      // 添加
      instance.on("add", (info: any) => {
        console.log("add", info);
        // @ts-ignore
        window.info = info;
      });
      // 删除
      instance.on("delete", (info: any) => {
        console.log("delete", info);
        // @ts-ignore
        window.info = info;
      });
      // 选中
      instance.on("select", (shape: any) => {
        console.log("select", shape);
        // @ts-ignore
        window.shape = shape;
      });

      instance.on("updated", (result: any) => {
        // console.log('标注结果', result)
        const list = [...result];
        list.sort((a, b) => a.index - b.index);
        output.value = JSON.stringify(list, null, 2);
      });
    }, 1000);

  }, []);

  function change(type: number) {
    instance.createType = type;
  }
  function zoom(flag: boolean) {
    instance.setScale(flag)
  }
  function fitting() {
    instance.fitZoom();
  }
  function onFocus() {
    instance.setFocusMode(!instance.focusMode);
  }
  function update() {
    console.log(instance.dataset);
    instance.update();
  }
  function changeData() {
    const data = JSON.parse(output.value);
    instance.setData(data);
  }

  return (
    <div className="box">
      <div className="left">
        <canvas className="container"></canvas>
        <div>
          <button onClick={() => change(1)}>create rect</button>
          <button onClick={() => change(2)}>create polygon</button>
          <button onClick={() => change(3)}>create dot</button>
          <button onClick={() => change(4)}>create line</button>
          <button onClick={() => change(5)}>create circle</button>
          <button onClick={() => change(0)}>cancel / move</button>
          <br />
          <button onClick={() => zoom(true)}>+</button>
          <button onClick={() => zoom(false)}>-</button>
          <button onClick={() => fitting()}>fitting</button>
          <button onClick={() => onFocus()}>focusMode</button>
          <button onClick={() => update()}>update</button>
        </div>
      </div>
    </div>
  );
}

export default App;
