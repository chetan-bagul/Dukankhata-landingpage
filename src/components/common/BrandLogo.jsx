export default function BrandLogo({
  variant = "icon", // "icon" | "horizontal" | "square"
  size = 36,
  height,
  width,
  className = "",
  style = {},
  alt = "DukanKhata",
}) {
  let src = "/logo.png";
  if (variant === "horizontal") {
    src = "/logo-horizontal.png";
  } else if (variant === "square") {
    src = "/logo-square.png";
  }

  const computedHeight = height || size;
  // Aspect ratio for horizontal logo (960 / 207 ~= 4.637)
  const computedWidth =
    width || (variant === "horizontal" ? Math.round(computedHeight * 4.637) : size);

  return (
    <img
      src={src}
      alt={alt}
      width={computedWidth}
      height={computedHeight}
      className={`brand-logo-img brand-logo-${variant} ${className}`.trim()}
      style={{
        height: `${computedHeight}px`,
        width: variant === "horizontal" ? "auto" : `${computedWidth}px`,
        maxWidth: "100%",
        objectFit: "contain",
        ...style,
      }}
      loading="eager"
    />
  );
}
