<template>
  <div id="app1">
    <img alt="Vue logo" src="./assets/sample.jpg" id="sampleImage">
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted } from 'vue';
import * as markerjs2 from 'markerjs2';

export default defineComponent({
  name: 'App',
  components: {
  },
  setup() {
    function showMarkerArea(target: HTMLImageElement) {
      console.log('1')
      const markerArea = new markerjs2.MarkerArea(target);
      markerArea.addEventListener(
        "render",
        (event) => (target.src = event.dataUrl)
      );
      markerArea.show();
    }

    onMounted(() => {
      const sampleImage = document.getElementById("sampleImage") as HTMLImageElement;
      sampleImage.addEventListener("click", () => {
        showMarkerArea(sampleImage);
      });
    })

    return {}
  },
});
</script>

<style>
html,
body {
  padding: 0px;
  margin: 0px;
}

#app1 {
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#sampleImage {
  max-width: 100%;
  max-height: 80%;
}

</style>
