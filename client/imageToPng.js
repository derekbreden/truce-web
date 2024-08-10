const imageToPng = (src, callback, size, crop) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  size = size || 1024;
  crop = crop || false;
  img.onload = () => {
    if (crop) {
      const ratio = size / Math.min(img.width, img.height);
      const img_width = img.width * ratio;
      const img_height = img.height * ratio;
      canvas.width = Math.min(img_width, img_height);
      canvas.height = Math.min(img_width, img_height);
      ctx.drawImage(
        img,
        Math.max(0,(img.width - img.height)/2),
        Math.max(0,(img.height - img.width)/2),
        img.width,
        img.height,
        0,
        0,
        img_width,
        img_height,
      );
    } else {
      const ratio = size / Math.max(img.width, img.height);
      canvas.width = Math.min(size, img.width * ratio);
      canvas.height = Math.min(size, img.height * ratio);
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
    }
    const data_url = canvas.toDataURL("image/png");
    callback({
      url: data_url,
      width: canvas.width,
      height: canvas.height,
    });
  };
  img.src = src;
};
