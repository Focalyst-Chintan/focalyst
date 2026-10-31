// Fixed ambient glow behind the phone shell (spec 2.5). Pure CSS, see .m-ambient in mobile.css.
export function MobileAmbient() {
    return <div aria-hidden className="m-ambient" />
}
