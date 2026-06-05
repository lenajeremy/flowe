import { useState, useMemo } from 'react'
import type { NodeType } from '@/types/workflow'
import { NODE_ACCENT_HEX, NODE_ICON_PATHS, NODE_LABELS } from '@/lib/nodeColors'
import { ChatPanel } from '@/components/panels/ChatPanel'
import { FloweIcon } from '@/components/FloweIcon'
import LiquidGlass from 'liquid-glass-react'

const CUSTOM_ICONS: Partial<Record<NodeType, React.ReactNode>> = {
  webhookTrigger: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_wh)">
        <g filter="url(#f0_wh)">
          <path d="M3.25067 9.07349C2.85749 9.31987 2.53541 9.66457 2.31624 10.0735C2.09707 10.4825 1.98841 10.9416 2.00098 11.4054C2.01355 11.8692 2.14693 12.3218 2.38794 12.7182C2.62894 13.1147 2.96923 13.4415 3.37518 13.6662C3.78113 13.8909 4.23868 14.0058 4.70263 13.9996C5.16659 13.9933 5.62088 13.8661 6.02061 13.6305C6.42035 13.3949 6.7517 13.0591 6.98193 12.6563C7.21215 12.2534 7.33327 11.7975 7.33333 11.3335H11.3333" stroke="#9889F8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <g filter="url(#f1_wh)">
          <path d="M10.044 13.6682C10.4002 13.8648 10.7966 13.9772 11.203 13.997C11.6093 14.0168 12.0148 13.9433 12.3884 13.7822C12.762 13.6212 13.0938 13.3767 13.3583 13.0677C13.6229 12.7586 13.8133 12.3931 13.9148 11.9992C14.0164 11.6052 14.0265 11.1933 13.9443 10.7948C13.8621 10.3964 13.6898 10.022 13.4407 9.7004C13.1915 9.37879 12.8721 9.11844 12.5068 8.93929C12.1416 8.76014 11.7402 8.66694 11.3333 8.66683C10.8627 8.66683 10.384 8.78616 10 9.00016L8 5.3335" stroke="#9889F8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
        <g filter="url(#f2_wh)">
          <path d="M10.6665 5.33341C10.6665 4.62617 10.3856 3.94789 9.88546 3.4478C9.38536 2.9477 8.70708 2.66675 7.99984 2.66675C7.29259 2.66675 6.61432 2.9477 6.11422 3.4478C5.61412 3.94789 5.33317 4.62617 5.33317 5.33341C5.33317 6.33741 5.8465 7.21208 6.6665 7.66675L4.6665 11.3334" stroke="#9889F8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </g>
      <defs>
        <filter id="f0_wh" x="-0.75" y="6.32349" width="14.8335" height="10.4263" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.748841 0 0 0 0 0.713742 0 0 0 0 0.976988 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_wh"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_wh" result="shape"/>
        </filter>
        <filter id="f1_wh" x="5.25" y="2.58325" width="11.499" height="14.167" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.748841 0 0 0 0 0.713742 0 0 0 0 0.976988 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_wh"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_wh" result="shape"/>
        </filter>
        <filter id="f2_wh" x="1.9165" y="-0.083252" width="11.5" height="14.1667" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.748841 0 0 0 0 0.713742 0 0 0 0 0.976988 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_wh"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_wh" result="shape"/>
        </filter>
        <clipPath id="clip_wh"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  scheduledTrigger: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_st)">
        <g filter="url(#f0_st)">
          <path d="M9.66683 12.6666L11.0002 13.9999L14.0002 10.9999M14.6569 8.3665C14.6635 8.24514 14.6668 8.12292 14.6668 7.99992C14.6668 4.31802 11.6821 1.33325 8.00016 1.33325C4.31826 1.33325 1.3335 4.31802 1.3335 7.99992C1.3335 11.6235 4.2245 14.5719 7.82582 14.6643M8.00016 3.99992V7.99992L10.4924 9.24604" stroke="#FF8CE8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      </g>
      <defs>
        <filter id="f0_st" x="-1.4165" y="-1.41675" width="18.8335" height="18.8311" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.54902 0 0 0 0 0.909804 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_st"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_st" result="shape"/>
        </filter>
        <clipPath id="clip_st"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  textInput: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_ti)">
        <g filter="url(#f0_ti)">
          <path d="M11.3335 2.22513C13.3262 3.37783 14.6668 5.53231 14.6668 7.99992C14.6668 11.6818 11.6821 14.6666 8.00016 14.6666C4.31826 14.6666 1.3335 11.6818 1.3335 7.99992C1.3335 5.53231 2.67416 3.37783 4.66683 2.22513M10.6668 7.99992L8.00016 10.6666L5.3335 7.99992M8.00016 10.6666V1.33325" stroke="#E5E4E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_ti" x="-1.4165" y="-1.41675" width="18.8335" height="18.8333" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.898039 0 0 0 0 0.894118 0 0 0 0 0.898039 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_ti"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_ti" result="shape"/>
        </filter>
        <clipPath id="clip_ti"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  imageInput: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_ii)">
        <g filter="url(#f0_ii)">
          <path d="M14.6667 3.33325L12.6667 5.33325L10.6667 3.33325M12.6667 5.33325V1.33325M8.33333 1.99992H5.2C4.0799 1.99992 3.51984 1.99992 3.09202 2.21791C2.71569 2.40965 2.40973 2.71561 2.21799 3.09194C2 3.51976 2 4.07981 2 5.19992V10.7999C2 11.92 2 12.4801 2.21799 12.9079C2.40973 13.2842 2.71569 13.5902 3.09202 13.7819C3.51984 13.9999 4.07989 13.9999 5.2 13.9999H11.3333C11.9533 13.9999 12.2633 13.9999 12.5176 13.9318C13.2078 13.7468 13.7469 13.2077 13.9319 12.5176C14 12.2632 14 11.9532 14 11.3333M7 5.66659C7 6.40297 6.40305 6.99992 5.66667 6.99992C4.93029 6.99992 4.33333 6.40297 4.33333 5.66659C4.33333 4.93021 4.93029 4.33325 5.66667 4.33325C6.40305 4.33325 7 4.93021 7 5.66659ZM9.99336 7.94535L4.3541 13.072C4.03691 13.3603 3.87831 13.5045 3.86429 13.6294C3.85213 13.7376 3.89364 13.845 3.97546 13.9169C4.06985 13.9999 4.28419 13.9999 4.71286 13.9999H10.9707C11.9301 13.9999 12.4098 13.9999 12.7866 13.8387C13.2596 13.6364 13.6365 13.2595 13.8388 12.7865C14 12.4097 14 11.93 14 10.9706C14 10.6478 14 10.4863 13.9647 10.336C13.9204 10.1471 13.8353 9.97016 13.7155 9.81752C13.6202 9.69605 13.4941 9.59522 13.242 9.39356L11.3772 7.90169C11.1249 7.69986 10.9988 7.59894 10.8599 7.56333C10.7374 7.53193 10.6086 7.536 10.4884 7.57505C10.352 7.61935 10.2324 7.72802 9.99336 7.94535Z" stroke="#E3FD7C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_ii" x="-0.75" y="-1.41675" width="18.1665" height="18.1667" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.890196 0 0 0 0 0.992157 0 0 0 0 0.486275 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_ii"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_ii" result="shape"/>
        </filter>
        <clipPath id="clip_ii"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  llm: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_llm)">
        <g filter="url(#f0_llm)">
          <path d="M6.00016 1.33325V3.33325M10.0002 1.33325V3.33325M6.00016 12.6666V14.6666M10.0002 12.6666V14.6666M12.6668 5.99992H14.6668M12.6668 9.33325H14.6668M1.3335 5.99992H3.3335M1.3335 9.33325H3.3335M6.5335 12.6666H9.46683C10.5869 12.6666 11.147 12.6666 11.5748 12.4486C11.9511 12.2569 12.2571 11.9509 12.4488 11.5746C12.6668 11.1467 12.6668 10.5867 12.6668 9.46658V6.53325C12.6668 5.41315 12.6668 4.85309 12.4488 4.42527C12.2571 4.04895 11.9511 3.74299 11.5748 3.55124C11.147 3.33325 10.5869 3.33325 9.46683 3.33325H6.5335C5.41339 3.33325 4.85334 3.33325 4.42551 3.55124C4.04919 3.74299 3.74323 4.04895 3.55148 4.42527C3.3335 4.85309 3.3335 5.41315 3.3335 6.53325V9.46658C3.3335 10.5867 3.3335 11.1467 3.55148 11.5746C3.74323 11.9509 4.04919 12.2569 4.42551 12.4486C4.85334 12.6666 5.41339 12.6666 6.5335 12.6666Z" stroke="#70F17B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_llm" x="-1.4165" y="-1.41675" width="18.8335" height="18.8333" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.439216 0 0 0 0 0.945098 0 0 0 0 0.482353 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_llm"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_llm" result="shape"/>
        </filter>
        <clipPath id="clip_llm"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  humanApproval: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_ha)">
        <g filter="url(#f0_ha)">
          <path d="M8.00016 10.3333H5.00017C4.06979 10.3333 3.6046 10.3333 3.22607 10.4482C2.3738 10.7067 1.70686 11.3736 1.44832 12.2259C1.3335 12.6044 1.3335 13.0696 1.3335 14M10.6668 12L12.0002 13.3333L14.6668 10.6667M9.66683 5C9.66683 6.65685 8.32368 8 6.66683 8C5.00997 8 3.66683 6.65685 3.66683 5C3.66683 3.34315 5.00997 2 6.66683 2C8.32368 2 9.66683 3.34315 9.66683 5Z" stroke="#F94B4B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_ha" x="-1.4165" y="-0.75" width="18.8335" height="17.5" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.976471 0 0 0 0 0.294118 0 0 0 0 0.294118 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_ha"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_ha" result="shape"/>
        </filter>
        <clipPath id="clip_ha"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  httpRequest: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_hr)">
        <g filter="url(#f0_hr)">
          <path d="M4.3335 12.6666C2.67664 12.6666 1.3335 11.3234 1.3335 9.66658C1.3335 8.10421 2.52783 6.82078 4.05332 6.6795C4.36537 4.78134 6.01366 3.33325 8.00016 3.33325C9.98667 3.33325 11.635 4.78134 11.947 6.6795C13.4725 6.82078 14.6668 8.10421 14.6668 9.66658C14.6668 11.3234 13.3237 12.6666 11.6668 12.6666C8.74027 12.6666 6.8957 12.6666 4.3335 12.6666Z" stroke="#51B4FB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_hr" x="-1.4165" y="0.583252" width="18.8335" height="14.8333" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.317647 0 0 0 0 0.705882 0 0 0 0 0.984314 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_hr"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_hr" result="shape"/>
        </filter>
        <clipPath id="clip_hr"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  emailSend: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_es)">
        <g filter="url(#f0_es)">
          <path d="M5.33292 6.33333H7.99959M5.33292 8.66667H9.99959M8.33292 13.3333C11.4625 13.3333 13.9996 10.7963 13.9996 7.66667C13.9996 4.53705 11.4625 2 8.33292 2C5.20331 2 2.66625 4.53705 2.66625 7.66667C2.66625 8.3 2.77015 8.90906 2.96183 9.47774C3.03397 9.69175 3.07003 9.79875 3.07654 9.88095C3.08296 9.96213 3.07811 10.019 3.05802 10.098C3.03769 10.1779 2.99278 10.261 2.90298 10.4272L1.81254 12.4456C1.657 12.7335 1.57923 12.8774 1.59664 12.9885C1.6118 13.0853 1.66875 13.1705 1.75237 13.2215C1.84837 13.2801 2.01112 13.2632 2.33661 13.2296L5.75063 12.8767C5.85402 12.866 5.90571 12.8606 5.95283 12.8624C5.99917 12.8642 6.03188 12.8686 6.07708 12.879C6.12302 12.8896 6.1808 12.9118 6.29636 12.9564C6.92839 13.1999 7.61507 13.3333 8.33292 13.3333Z" stroke="#FFB74B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_es" x="-1.15576" y="-0.75" width="17.9053" height="16.8333" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 0.717647 0 0 0 0 0.294118 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_es"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_es" result="shape"/>
        </filter>
        <clipPath id="clip_es"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  branch: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_br)">
        <g filter="url(#f0_br)">
          <path d="M11.3333 13.3333H11.2C10.0799 13.3333 9.51984 13.3333 9.09202 13.1153C8.71569 12.9235 8.40973 12.6176 8.21799 12.2412C8 11.8134 8 11.2534 8 10.1333V5.86659C8 4.74648 8 4.18643 8.21799 3.7586C8.40973 3.38228 8.71569 3.07632 9.09202 2.88457C9.51984 2.66659 10.0799 2.66659 11.2 2.66659H11.3333M11.3333 13.3333C11.3333 14.0696 11.9303 14.6666 12.6667 14.6666C13.403 14.6666 14 14.0696 14 13.3333C14 12.5969 13.403 11.9999 12.6667 11.9999C11.9303 11.9999 11.3333 12.5969 11.3333 13.3333ZM11.3333 2.66659C11.3333 3.40296 11.9303 3.99992 12.6667 3.99992C13.403 3.99992 14 3.40296 14 2.66659C14 1.93021 13.403 1.33325 12.6667 1.33325C11.9303 1.33325 11.3333 1.93021 11.3333 2.66659ZM4.66667 7.99992L11.3333 7.99992M4.66667 7.99992C4.66667 8.7363 4.06971 9.33325 3.33333 9.33325C2.59695 9.33325 2 8.7363 2 7.99992C2 7.26354 2.59695 6.66658 3.33333 6.66658C4.06971 6.66658 4.66667 7.26354 4.66667 7.99992ZM11.3333 7.99992C11.3333 8.7363 11.9303 9.33325 12.6667 9.33325C13.403 9.33325 14 8.7363 14 7.99992C14 7.26354 13.403 6.66658 12.6667 6.66658C11.9303 6.66658 11.3333 7.26354 11.3333 7.99992Z" stroke="#64F4BF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_br" x="-0.75" y="-1.41675" width="17.5" height="18.8333" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.392157 0 0 0 0 0.956863 0 0 0 0 0.74902 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_br"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_br" result="shape"/>
        </filter>
        <clipPath id="clip_br"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  notion: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Notion bold italic N */}
      <path d="M3 2.8C3.6 3.28 3.84 3.22 5.04 3.14L12.24 2.72C12.48 2.72 12.28 2.48 12.16 2.44L11.04 1.64C10.82 1.48 10.5 1.3 9.9 1.36L2.86 1.86C2.62 1.88 2.56 2 2.66 2.1L3 2.8Z" fill="white" opacity="0.5"/>
      <rect x="2.5" y="3.2" width="11" height="10" rx="1" fill="none" stroke="white" strokeWidth="0.8" opacity="0.4"/>
      <path d="M5 5.5V10.5M5 5.5L11 10.5M11 5.5V10.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  linear: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip_ln"><circle cx="8" cy="8" r="5.6"/></clipPath>
      </defs>
      <g clipPath="url(#clip_ln)">
        <circle cx="8" cy="8" r="5.6" fill="white" opacity="0.1"/>
        <line x1="0.5" y1="11"  x2="7.5"  y2="0.5"  stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="3.5" y1="13.5" x2="11.5" y2="2"    stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="7"   y1="15"   x2="15"   y2="4"    stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="10"  y1="16"   x2="16.5" y2="7"    stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
      </g>
    </svg>
  ),
  loop: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_lp)">
        <g filter="url(#f0_lp)">
          <path d="M13.6352 8.59536C13.45 10.3353 12.4641 11.9658 10.8328 12.9076C8.12244 14.4724 4.65677 13.5438 3.09196 10.8335L2.92529 10.5448M2.36392 7.40467C2.54912 5.66474 3.53498 4.03426 5.16631 3.09241C7.87663 1.5276 11.3423 2.45623 12.9071 5.16655L13.0738 5.45523M2.32861 12.044L2.81665 10.2227L4.63801 10.7107M11.3614 5.28934L13.1828 5.77737L13.6708 3.95601" stroke="#E45FFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_lp" x="-0.421387" y="-0.417969" width="16.8423" height="16.8359" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.894118 0 0 0 0 0.372549 0 0 0 0 1 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_lp"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_lp" result="shape"/>
        </filter>
        <clipPath id="clip_lp"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
  textOutput: (
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#clip_to)">
        <g filter="url(#f0_to)">
          <path d="M4.66683 13.7747C2.67416 12.622 1.3335 10.4675 1.3335 7.99992C1.3335 4.31802 4.31826 1.33325 8.00016 1.33325C11.6821 1.33325 14.6668 4.31802 14.6668 7.99992C14.6668 10.4675 13.3262 12.622 11.3335 13.7747M5.3335 7.99996L8.00016 5.3333L10.6668 7.99996M8.00016 5.3333V14.6666" stroke="#E5E4E5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" shapeRendering="crispEdges"/>
        </g>
      </g>
      <defs>
        <filter id="f0_to" x="-1.4165" y="-1.41675" width="18.8335" height="18.8335" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feFlood floodOpacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset/><feGaussianBlur stdDeviation="1"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0.898039 0 0 0 0 0.894118 0 0 0 0 0.898039 0 0 0 1 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_to"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_to" result="shape"/>
        </filter>
        <clipPath id="clip_to"><rect width="16" height="16" fill="white"/></clipPath>
      </defs>
    </svg>
  ),
}

const PALETTE_GROUPS: Array<{ category: string; items: NodeType[] }> = [
  { category: 'Triggers', items: ['webhookTrigger', 'scheduledTrigger'] },
  { category: 'Input/Output', items: ['textInput', 'imageInput', 'textOutput'] },
  { category: 'Actions', items: ['llm', 'humanApproval', 'httpRequest', 'emailSend', 'branch', 'loop'] },
  { category: 'Integrations', items: ['notion', 'linear'] },
]

function PaletteItem({ type }: { type: NodeType }) {
  const color = NODE_ACCENT_HEX[type]
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/flowe-node-type', type)
        e.dataTransfer.effectAllowed = 'copy'
      }}
      className="group flex cursor-grab items-center active:cursor-grabbing"
      style={{
        height: 48,
        borderRadius: 8,
        gap: 12,
        padding: 8,
        border: '1px solid #2B2B3F',
        boxShadow: '0px 2px 8px 0px #FFFFFF1A inset',
      }}
    >
      <div
        className="flex flex-shrink-0 items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:overflow-visible"
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          padding: 8,
          border: '1px solid #2B2B3F',
          boxShadow: '0px 2px 8px 1px #FFFFFF26 inset',
          backgroundColor: CUSTOM_ICONS[type] ? undefined : color + '22',
          overflow: 'visible',
        }}
      >
        {CUSTOM_ICONS[type] ?? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d={NODE_ICON_PATHS[type]} stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-[12px] font-medium text-[var(--color-text)] leading-tight truncate">
        {NODE_LABELS[type]}
      </span>
    </div>
  )
}

type LeftTab = 'nodes' | 'chat'

export function NodePalette({ onCollapse }: { onCollapse?: () => void }) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<LeftTab>('chat')

  const query = search.trim().toLowerCase()
  const isSearching = query.length > 0

  const filteredGroups = useMemo(() => {
    if (!isSearching) return PALETTE_GROUPS
    return PALETTE_GROUPS
      .map((g) => ({
        ...g,
        items: g.items.filter((t) =>
          NODE_LABELS[t].toLowerCase().includes(query) ||
          g.category.toLowerCase().includes(query)
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [isSearching, query])

  return (
    <aside className="flex h-full w-full flex-col bg-[var(--color-canvas)]" style={{ overflow: 'clip' }}>
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-3 py-3">
        {/* AI builder tab */}
        <button
          type="button"
          onClick={() => setActiveTab('chat')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
            activeTab === 'chat'
              ? 'bg-white/8 border-white/15 text-white'
              : 'bg-transparent border-white/5 text-[var(--color-muted)] hover:border-white/10 hover:text-[var(--color-text)]'
          }`}
        >
          <FloweIcon size={14} className={activeTab === 'chat' ? 'text-white' : 'text-[var(--color-muted)]'} />
          AI builder
        </button>

        {/* Elements tab */}
        <button
          type="button"
          onClick={() => setActiveTab('nodes')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
            activeTab === 'nodes'
              ? 'bg-white/8 border-white/15 text-white'
              : 'bg-transparent border-white/5 text-[var(--color-muted)] hover:border-white/10 hover:text-[var(--color-text)]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M1.5 1.5h4v4h-4zM7.5 1.5h4v4h-4zM1.5 7.5h4v4h-4zM7.5 7.5h4v4h-4z"
              stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
            />
          </svg>
          Elements
        </button>

        <div className="flex-1" />

        {/* Collapse button */}
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/10 text-[var(--color-muted)] hover:text-[var(--color-text)] hover:border-white/20 transition-colors"
            title="Collapse panel"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M7.5 2L3.5 5.5l4 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>

      {/* Tab content */}
      {activeTab === 'nodes' ? (
        <>
          {/* Search */}
          <div className="px-3 pt-1 pb-2">
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Nodes"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] py-2 pl-3 pr-9 text-[12px] text-[var(--color-text)] placeholder:text-[var(--color-muted)] outline-none focus:border-[var(--color-border2)]"
              />
              <svg
                width="13" height="13" viewBox="0 0 13 13" fill="none"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]"
              >
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div className="overflow-y-auto flex-1">
            <div className="flex flex-col gap-3 px-3 pb-3">
              {filteredGroups.length === 0 ? (
                <p className="text-[11px] text-[var(--color-muted)] text-center py-4">No nodes match "{search}"</p>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.category}>
                    <span className="text-[9px] text-[var(--color-subtle)] uppercase tracking-widest font-medium px-0.5 mb-1.5 block">
                      {group.category}
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((type) => (
                        <PaletteItem key={type} type={type} />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      ) : (
        <ChatPanel />
      )}
    </aside>
  )
}
