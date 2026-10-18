import React from "react";

/** Monogramme monochrome T-Bouclier — identité officielle PastaTshield. */
export default function TShieldIcon({
  size = 32,
  className = "",
  title = "T-Bouclier PastaTshield",
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <path
        d="M7 7.5H33V16.2C33 26.1 27.8 32.9 20 36C12.2 32.9 7 26.1 7 16.2V7.5Z"
        stroke="currentColor"
        strokeWidth="2.65"
        strokeLinejoin="round"
      />
      <path
        d="M11.4 12.4H28.6M20 12.5V28.6"
        stroke="currentColor"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
