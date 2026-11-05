'use client';

import { useEffect, useState } from 'react';
import { clsx } from 'clsx';
import {
  Smartphone, MessageCircle, KeyRound, ShieldCheck, LockKeyhole, Eye, EyeOff, ArrowLeft, CircleCheck, TimerReset, Lock,
} from 'lucide-react';
import {
  pinApi, pinProblem, pinStrength, digitsOnly, formatClock, channelName, PIN_LENGTH, OTP_LENGTH,
} from '@/lib/linkOpener/desktopPin';
import PinLayout, { PinError, PrimaryButton, LinkButton } from './PinLayout';
import CodeField from './CodeField';

// The three PIN screens shown by <DesktopPinGate/>:
//   <PinFlow mode="setup">  first sign-in: mobile → OTP → create PIN → confirm
//   <PinFlow mode="reset">  forgot PIN:    WhatsApp OTP → create PIN → confirm
//   <UnlockScreen>          every later launch: enter PIN

// Seconds left until `target` (a ms timestamp), ticking while it runs.
function useSecondsUntil(target) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return undefined;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [target]);
  return target ? Math.max(0, Math.ceil((target - now) / 1000)) : 0;
}

const SETUP_STEPS = [
  { title: 'Verify mobile', hint: 'A number you can receive codes on' },
  { title: 'Enter code', hint: '6-digit verification code' },
  { title: 'Create PIN', hint: '6 digits only you know' },
  { title: 'Confirm PIN', hint: 'Type it once more' },
];
const RESET_STEPS = [
  { title: 'WhatsApp code', hint: 'Sent to your verified number' },
  { title: 'Enter code', hint: '6-digit verification code' },
  { title: 'New PIN', hint: '6 digits only you know' },
  { title: 'Confirm PIN', hint: 'Type it once more' },
];
const STEP_INDEX = { mobile: 0, send: 0, otp: 1, create: 2, confirm: 3, done: 4 };

export function PinFlow({ mode, status, user, onLogout, onDone, onCancel }) {
  const isSetup = mode === 'setup';
  const [step, setStep] = useState(isSetup ? 'mobile' : 'send');
  const [mobile, setMobile] = useState(() => digitsOnly(status?.accountMobile, 10));
  const [info, setInfo] = useState(null); // { channel, mobileMasked, expiresAt, resendAt }
  const [code, setCode] = useState('');
  const [pinToken, setPinToken] = useState('');
  const [pin, setPin] = useState('');
  const [pin2, setPin2] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);

  const expiresIn = useSecondsUntil(step === 'otp' ? info?.expiresAt : null);
  const resendIn = useSecondsUntil(step === 'otp' ? info?.resendAt : null);

  // The success tick moves on to the app by itself after a moment.
  useEffect(() => {
    if (step !== 'done') return undefined;
    const id = setTimeout(onDone, 1800);
    return () => clearTimeout(id);
  }, [step, onDone]);

  const fail = (message) => {
    setError(message);
    setShake((n) => n + 1);
  };

  function go(next) {
    setError('');
    setStep(next);
  }

  async function sendCode(e) {
    e?.preventDefault();
    if (isSetup && mobile.length !== 10) return fail('Enter your 10-digit mobile number');
    setBusy(true);
    setError('');
    const { ok, data } = await pinApi.sendOtp(mode, isSetup ? mobile : undefined);
    setBusy(false);
    if (!ok) {
      // Already sent a moment ago → still let them type that code.
      if (data.retryAfter && info) {
        setInfo((i) => ({ ...i, resendAt: Date.now() + data.retryAfter * 1000 }));
        return go('otp');
      }
      return fail(data.error || 'Could not send the code. Please try again.');
    }
    const t = Date.now();
    setInfo({
      channel: data.channel,
      mobileMasked: data.mobileMasked,
      expiresAt: t + (data.expiresIn || 300) * 1000,
      resendAt: t + (data.resendIn || 30) * 1000,
    });
    setCode('');
    go('otp');
  }

  async function verifyCode(value = code) {
    if (value.length !== OTP_LENGTH) return fail(`Enter the ${OTP_LENGTH}-digit code`);
    setBusy(true);
    setError('');
    const { ok, data } = await pinApi.verifyOtp(mode, value, isSetup ? mobile : undefined);
    setBusy(false);
    if (!ok) {
      setCode('');
      return fail(data.error || 'Incorrect code. Please try again.');
    }
    setPinToken(data.pinToken);
    setPin('');
    setPin2('');
    go('create');
  }

  function acceptPin(value = pin) {
    const problem = pinProblem(value);
    if (problem) return fail(problem);
    setPin2('');
    go('confirm');
  }

  async function confirmPin(value = pin2) {
    if (value.length !== PIN_LENGTH) return fail(`Enter all ${PIN_LENGTH} digits`);
    if (value !== pin) {
      setPin2('');
      return fail("PINs don't match. Try again.");
    }
    setBusy(true);
    setError('');
    const { ok, data } = await pinApi.savePin(pinToken, value);
    setBusy(false);
    if (ok) return go('done');
    if (data.expired) {
      setStep(isSetup ? 'mobile' : 'send');
      return fail(data.error);
    }
    setPin('');
    setPin2('');
    setStep('create');
    fail(data.error || 'Could not save your PIN. Please try again.');
  }

  const layout = {
    user,
    onLogout,
    steps: isSetup ? SETUP_STEPS : RESET_STEPS,
    current: STEP_INDEX[step],
    aside: isSetup ? (
      <>
        <h2 className="text-3xl font-bold leading-tight">Protect your<br />desktop app</h2>
        <p className="mt-3 max-w-xs text-sm text-white/75">Set a 6-digit PIN so only you can open your saved links and apps on this computer.</p>
      </>
    ) : (
      <>
        <h2 className="text-3xl font-bold leading-tight">Reset your PIN</h2>
        <p className="mt-3 max-w-xs text-sm text-white/75">We&apos;ll send a code on WhatsApp to the number you verified. Then you can pick a new PIN.</p>
      </>
    ),
    footer: onCancel && step !== 'done' && (
      <button type="button" onClick={onCancel} className="font-medium text-muted transition-colors hover:text-foreground">
        Back to unlock
      </button>
    ),
  };

  // ── Step: mobile number (setup) ──────────────────────────────────────────
  if (step === 'mobile') {
    return (
      <PinLayout {...layout} icon={Smartphone} title="Verify your mobile number" subtitle="First time on this desktop app? Verify your number and set a PIN. We'll use this number if you ever need to reset your PIN.">
        <form onSubmit={sendCode} noValidate>
          <label htmlFor="pin-mobile" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-subtle">Mobile number</label>
          <div className={clsx('flex h-12 overflow-hidden rounded-xl border-2 bg-background transition-colors focus-within:border-accent focus-within:shadow-[0_0_0_4px_rgba(var(--color-accent-rgb),0.12)]', error ? 'border-neg/60' : 'border-divider-light')}>
            <span className="flex items-center gap-1.5 border-r border-divider bg-card px-3.5 text-sm font-semibold text-muted">🇮🇳 +91</span>
            <input
              id="pin-mobile"
              autoFocus
              value={mobile.replace(/(\d{5})(\d{1,5})/, '$1 $2')}
              onChange={(e) => { setMobile(digitsOnly(e.target.value, 10)); setError(''); }}
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              className="min-w-0 flex-1 bg-transparent px-3.5 text-base font-semibold tracking-wide text-foreground outline-none placeholder:font-normal placeholder:text-subtle"
            />
            {mobile.length === 10 && <CircleCheck size={20} className="pin-pop mr-3 self-center text-action" />}
          </div>
          <PinError>{error}</PinError>
          <PrimaryButton busy={busy} disabled={mobile.length !== 10} className="mt-6">
            {busy ? 'Sending code…' : 'Send verification code'}
          </PrimaryButton>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-subtle">
            <MessageCircle size={13} className="text-[#1DA851]" /> Code arrives on WhatsApp (or SMS) in a few seconds
          </p>
        </form>
      </PinLayout>
    );
  }

  // ── Step: send WhatsApp code (reset) ─────────────────────────────────────
  if (step === 'send') {
    return (
      <PinLayout {...layout} icon={MessageCircle} tone="whatsapp" title="Forgot your PIN?" subtitle="No problem. We'll send a verification code on WhatsApp to your verified number.">
        <form onSubmit={sendCode}>
          <div className="flex items-center gap-3 rounded-2xl border border-divider bg-background p-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-[#25D366]/30">
              <MessageCircle size={22} />
            </span>
            <div>
              <p className="text-xs font-medium text-subtle">WhatsApp</p>
              <p className="text-base font-bold tracking-wider text-foreground">+91 {status?.mobileMasked || '••••••••••'}</p>
            </div>
          </div>
          <PinError>{error}</PinError>
          <PrimaryButton busy={busy} className="mt-6 !bg-[#1DA851] !shadow-[#25D366]/25 hover:!bg-[#178f45]">
            {busy ? 'Sending…' : 'Send code on WhatsApp'}
          </PrimaryButton>
          <p className="mt-4 text-center text-xs text-subtle">Lost access to this number? Contact support to reset your PIN.</p>
        </form>
      </PinLayout>
    );
  }

  // ── Step: enter OTP ──────────────────────────────────────────────────────
  if (step === 'otp') {
    const isWhatsapp = info?.channel !== 'sms';
    const expired = expiresIn === 0;
    return (
      <PinLayout
        {...layout}
        icon={isWhatsapp ? MessageCircle : Smartphone}
        tone={isWhatsapp ? 'whatsapp' : 'accent'}
        title="Enter verification code"
        subtitle={<>We sent a 6-digit code on <span className="font-semibold text-foreground">{channelName(info?.channel)}</span> to <span className="font-semibold text-foreground">+91 {info?.mobileMasked}</span>.</>}
      >
        <form onSubmit={(e) => { e.preventDefault(); verifyCode(); }}>
          <CodeField
            value={code}
            onChange={(v) => { setCode(v); setError(''); }}
            onComplete={verifyCode}
            readOnly={busy}
            invalid={!!error}
            shake={shake}
            label="Verification code"
            autoComplete="one-time-code"
          />
          <div className="mt-3 flex items-center justify-center gap-1.5 text-xs">
            {expired ? (
              <span className="font-medium text-neg">Code expired. Request a new one.</span>
            ) : (
              <span className="text-subtle">Code expires in <span className="font-semibold tabular-nums text-muted">{formatClock(expiresIn)}</span></span>
            )}
          </div>
          <PinError>{error}</PinError>
          <PrimaryButton busy={busy} disabled={code.length !== OTP_LENGTH || expired} className="mt-6">
            {busy ? 'Verifying…' : 'Verify code'}
          </PrimaryButton>
          <div className="mt-5 flex items-center justify-between">
            {isSetup ? (
              <LinkButton onClick={() => go('mobile')} className="inline-flex items-center gap-1 !text-muted hover:!text-foreground">
                <ArrowLeft size={14} /> Change number
              </LinkButton>
            ) : <span />}
            <LinkButton onClick={sendCode} disabled={busy || resendIn > 0} className="inline-flex items-center gap-1.5">
              <TimerReset size={14} />
              {resendIn > 0 ? <span className="tabular-nums">Resend in {formatClock(resendIn)}</span> : 'Resend code'}
            </LinkButton>
          </div>
        </form>
      </PinLayout>
    );
  }

  // ── Step: create PIN ─────────────────────────────────────────────────────
  if (step === 'create') {
    const strength = pinStrength(pin);
    const problem = pin.length === PIN_LENGTH ? pinProblem(pin) : null;
    return (
      <PinLayout {...layout} icon={KeyRound} title={isSetup ? 'Create your 6-digit PIN' : 'Create a new PIN'} subtitle="You'll enter this PIN each time you open the desktop app. Pick something easy for you and hard for others to guess.">
        <form onSubmit={(e) => { e.preventDefault(); acceptPin(); }}>
          <CodeField
            value={pin}
            onChange={(v) => { setPin(v); setError(''); }}
            onComplete={acceptPin}
            masked={!reveal}
            invalid={!!error}
            shake={shake}
            label="New PIN"
          />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex flex-1 gap-1.5" aria-hidden="true">
              {[1, 2, 3].map((n) => (
                <span
                  key={n}
                  className={clsx(
                    'h-1.5 flex-1 rounded-full transition-colors duration-300',
                    strength >= n ? (strength === 1 ? 'bg-neg' : strength === 2 ? 'bg-amber-500' : 'bg-action') : 'bg-divider',
                  )}
                />
              ))}
            </div>
            <span className={clsx('w-14 text-right text-xs font-semibold', strength === 1 ? 'text-neg' : strength === 2 ? 'text-amber-600' : strength === 3 ? 'text-action' : 'text-subtle')}>
              {['', pin.length < PIN_LENGTH ? '' : 'Weak', 'Good', 'Strong'][strength]}
            </span>
            <RevealToggle reveal={reveal} onToggle={() => setReveal((r) => !r)} />
          </div>
          <PinError>{error || problem}</PinError>
          <ul className="mt-4 space-y-1 text-xs text-subtle">
            <li>• Avoid repeated digits (111111) or sequences (123456)</li>
            <li>• Don&apos;t use your birthday or mobile number</li>
          </ul>
          <PrimaryButton disabled={pin.length !== PIN_LENGTH || !!problem} className="mt-6">Continue</PrimaryButton>
        </form>
      </PinLayout>
    );
  }

  // ── Step: confirm PIN ────────────────────────────────────────────────────
  if (step === 'confirm') {
    return (
      <PinLayout {...layout} icon={ShieldCheck} title="Confirm your PIN" subtitle="Enter the same 6 digits again to make sure you've got it.">
        <form onSubmit={(e) => { e.preventDefault(); confirmPin(); }}>
          <CodeField
            value={pin2}
            onChange={(v) => { setPin2(v); setError(''); }}
            onComplete={confirmPin}
            masked={!reveal}
            readOnly={busy}
            invalid={!!error}
            shake={shake}
            label="Confirm PIN"
          />
          <div className="mt-3 flex justify-end">
            <RevealToggle reveal={reveal} onToggle={() => setReveal((r) => !r)} />
          </div>
          <PinError>{error}</PinError>
          <PrimaryButton busy={busy} disabled={pin2.length !== PIN_LENGTH} className="mt-6">
            {busy ? 'Saving PIN…' : isSetup ? 'Set PIN' : 'Save new PIN'}
          </PrimaryButton>
          <div className="mt-5 text-center">
            <LinkButton onClick={() => { setPin(''); setPin2(''); go('create'); }} className="inline-flex items-center gap-1 !text-muted hover:!text-foreground">
              <ArrowLeft size={14} /> Choose a different PIN
            </LinkButton>
          </div>
        </form>
      </PinLayout>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────
  return (
    <PinLayout {...layout} icon={CircleCheck} tone="success" title={isSetup ? 'Your PIN is ready' : 'PIN changed'} subtitle={isSetup ? "From now on you'll unlock the desktop app with your PIN." : 'Use your new PIN the next time you open the app.'}>
      <div className="flex flex-col items-center gap-5">
        <div className="pin-pop relative flex h-24 w-24 items-center justify-center rounded-full bg-action-soft">
          <span className="absolute inset-0 animate-ping rounded-full bg-action/20" />
          <ShieldCheck size={44} className="relative text-action" />
        </div>
        <PrimaryButton type="button" onClick={onDone}>Open Link Opener</PrimaryButton>
      </div>
    </PinLayout>
  );
}

function RevealToggle({ reveal, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className="inline-flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-foreground" aria-pressed={reveal}>
      {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
      {reveal ? 'Hide' : 'Show'}
    </button>
  );
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

// ── Unlock ────────────────────────────────────────────────────────────────
export function UnlockScreen({ status, user, onLogout, onUnlocked, onForgot, onMissing }) {
  const [pin, setPin] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const [success, setSuccess] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(status?.attemptsLeft ?? 5);
  const [lockedUntil, setLockedUntil] = useState(() => (status?.lockedUntil ? new Date(status.lockedUntil).getTime() : null));
  const lockedFor = useSecondsUntil(lockedUntil);
  const locked = lockedFor > 0;
  const firstName = (user?.name || '').split(' ')[0];

  async function submit(value = pin) {
    if (value.length !== PIN_LENGTH || busy || locked) return;
    setBusy(true);
    setError('');
    const { ok, status: code, data } = await pinApi.unlock(value);
    setBusy(false);
    if (ok) {
      setSuccess(true);
      setTimeout(onUnlocked, 450);
      return;
    }
    if (code === 404) return onMissing();
    setPin('');
    if (typeof data.attemptsLeft === 'number') setAttemptsLeft(data.attemptsLeft);
    if (data.lockedUntil) setLockedUntil(new Date(data.lockedUntil).getTime());
    setError(data.error || 'Incorrect PIN');
    setShake((n) => n + 1);
  }

  const layout = {
    user,
    onLogout,
    aside: (
      <>
        <p className="text-sm font-medium text-white/70">{greeting()}{firstName ? ',' : ''}</p>
        <h2 className="mt-1 text-4xl font-bold leading-tight">{firstName || 'Welcome back'}</h2>
        <p className="mt-3 max-w-xs text-sm text-white/75">Enter your PIN to open your saved links and desktop applications.</p>
        <div className="mt-10 flex h-28 w-28 items-center justify-center rounded-3xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
          <LockKeyhole size={52} strokeWidth={1.6} />
        </div>
      </>
    ),
  };

  if (locked) {
    return (
      <PinLayout {...layout} icon={Lock} tone="danger" title="PIN temporarily locked" subtitle="Too many wrong attempts. For your security, PIN entry is paused.">
        <div className="rounded-2xl border border-divider bg-background p-5 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Try again in</p>
          <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">{formatClock(lockedFor)}</p>
        </div>
        <PrimaryButton type="button" onClick={onForgot} className="mt-6 !bg-[#1DA851] !shadow-[#25D366]/25 hover:!bg-[#178f45]">
          <MessageCircle size={18} /> Reset PIN with WhatsApp
        </PrimaryButton>
      </PinLayout>
    );
  }

  return (
    <PinLayout {...layout} icon={success ? CircleCheck : LockKeyhole} tone={success ? 'success' : 'accent'} title={success ? 'Unlocked' : 'Enter your PIN'} subtitle={success ? 'Opening your workspace…' : 'Your desktop app is locked. Enter your 6-digit PIN to continue.'}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <CodeField
          value={pin}
          onChange={(v) => { setPin(v); setError(''); }}
          onComplete={submit}
          masked={!reveal}
          readOnly={busy || success}
          invalid={!!error}
          shake={shake}
          label="PIN"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className={clsx('text-xs', attemptsLeft <= 2 ? 'font-semibold text-neg' : 'text-subtle')}>
            {attemptsLeft < 5 ? `${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left` : ' '}
          </span>
          <RevealToggle reveal={reveal} onToggle={() => setReveal((r) => !r)} />
        </div>
        <PinError>{error}</PinError>
        <PrimaryButton busy={busy} disabled={pin.length !== PIN_LENGTH || success} className={clsx('mt-6', success && '!bg-action')}>
          {success ? 'Unlocked' : busy ? 'Checking…' : 'Unlock'}
        </PrimaryButton>
        <div className="mt-5 flex items-center justify-between">
          <LinkButton onClick={onForgot} className="inline-flex items-center gap-1.5">
            <MessageCircle size={14} /> Forgot PIN?
          </LinkButton>
          <span className="text-xs text-subtle">Press <kbd className="rounded border border-divider-light bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold">Ctrl</kbd> + <kbd className="rounded border border-divider-light bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold">L</kbd> to lock</span>
        </div>
      </form>
    </PinLayout>
  );
}
