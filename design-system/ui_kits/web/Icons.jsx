/* SponsorTrack icon set — bespoke SVG, currentColor, 1.8 stroke */
const _Icon = (paths, opts = {}) => ({ size = 18, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth={opts.sw || 1.8} strokeLinecap="round" strokeLinejoin="round"
       className={className}>{paths}</svg>
);

const PlaneIcon       = _Icon(<><path d="M21 16V8C21 6.9 20.1 6 19 6H15L13 2H11L9 6H5C3.9 6 3 6.9 3 8V16C3 17.1 3.9 18 5 18H19C20.1 18 21 17.1 21 16Z"/><path d="M7 22H17"/><path d="M12 18V22"/></>, { sw: 1.6 });
const BarChartIcon    = _Icon(<><rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="6" width="4" height="15" rx="1"/><rect x="17" y="2" width="4" height="19" rx="1"/></>);
const ClockIcon       = _Icon(<><circle cx="12" cy="12" r="10"/><path d="M12 6V12L16 14"/></>);
const ChatIcon        = _Icon(<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>);
const UserIcon        = _Icon(<><path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21"/><circle cx="12" cy="7" r="4"/></>);
const UsersIcon       = _Icon(<><path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21"/><circle cx="9" cy="7" r="4"/></>);
const PlusIcon        = _Icon(<><circle cx="12" cy="12" r="10"/><path d="M12 8V16"/><path d="M8 12H16"/></>, { sw: 2 });
const CloseIcon       = _Icon(<><path d="M18 6L6 18"/><path d="M6 6L18 18"/></>, { sw: 2 });
const CheckIcon       = _Icon(<path d="M5 12L10 17L19 8"/>, { sw: 3 });
const CalendarIcon    = _Icon(<><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2V6"/><path d="M8 2V6"/><path d="M3 10H21"/></>);
const ChevronRightIcon = _Icon(<path d="M9 18L15 12L9 6"/>, { sw: 2 });
const ArrowLeftIcon   = _Icon(<><path d="M19 12H5"/><path d="M12 19L5 12L12 5"/></>, { sw: 2 });
const SunIcon         = _Icon(<><circle cx="12" cy="12" r="5"/><path d="M12 1V3M12 21V23M4.22 4.22L5.64 5.64M18.36 18.36L19.78 19.78M1 12H3M21 12H23M4.22 19.78L5.64 18.36M18.36 5.64L19.78 4.22"/></>, { sw: 2 });

// Step icons (IRCC stages)
const SubmittedIcon   = _Icon(<><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></>);
const AorIcon         = _Icon(<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 12L11 14L15 10"/></>);
const BilIcon         = _Icon(<><path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"/><circle cx="12" cy="11" r="3"/><path d="M12 14V16"/></>);
const MedicalIcon     = _Icon(<><path d="M12 4V20"/><path d="M4 12H20"/><rect x="5" y="5" width="14" height="14" rx="3"/></>);
const BackgroundIcon  = _Icon(<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8H10"/><path d="M7 12H17"/><path d="M7 16H14"/><circle cx="16" cy="8" r="2"/></>);
const PortalIcon      = _Icon(<><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21H16"/><path d="M12 17V21"/><path d="M7 9L10 12L7 15"/></>);
const EcoprIcon       = _Icon(<><path d="M3 21H21"/><path d="M5 21V7L12 3L19 7V21"/><rect x="9" y="13" width="6" height="8"/><rect x="9" y="9" width="6" height="2"/></>);
const EligibilityIcon = _Icon(<><circle cx="12" cy="8" r="4"/><path d="M6 20C6 16.7 8.7 14 12 14C15.3 14 18 16.7 18 20"/><path d="M16 4L18 6L22 2"/></>);

Object.assign(window, {
  PlaneIcon, BarChartIcon, ClockIcon, ChatIcon, UserIcon, UsersIcon,
  PlusIcon, CloseIcon, CheckIcon, CalendarIcon, ChevronRightIcon, ArrowLeftIcon, SunIcon,
  SubmittedIcon, AorIcon, BilIcon, MedicalIcon, BackgroundIcon, PortalIcon, EcoprIcon, EligibilityIcon,
});
