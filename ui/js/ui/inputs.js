obstacleRadiusInput.addEventListener("input", () => {
  let val = parseInt(obstacleRadiusInput.value);
  if (val > 200) {
    obstacleRadiusInput.value = 200;
  } else if (val < 10) {
    obstacleRadiusInput.value = 10;
  }
});
