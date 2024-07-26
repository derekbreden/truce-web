const imageToPng = (src, callback) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = () => {
    const ratio =
      1024 / Math.max(img.width, img.height);
    canvas.width = Math.min(1024, img.width * ratio);
    canvas.height = Math.min(1024, img.height * ratio);
    ctx.drawImage(
      img,
      0,
      0,
      img.width,
      img.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    const data_url = canvas.toDataURL("image/png");
    callback({
      url: data_url,
      width: canvas.width,
      height: canvas.height,
    });
  };
  img.src = src;
};