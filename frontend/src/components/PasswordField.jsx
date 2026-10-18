import { useState } from 'react';
import Icon from './Icon.jsx';

export default function PasswordField({ id, label = 'Password', hint, error, ...props }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="field-label" htmlFor={id}>{label}</label>
        {hint}
      </div>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} className={`field-input pr-11 ${error ? 'field-input-error' : ''}`} {...props} />
        <button type="button" aria-label="Toggle password visibility" onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-on-surface">
          <Icon name={show ? 'visibility' : 'visibility_off'} size={19} />
        </button>
      </div>
      {error && <p className="field-error"><Icon name="error" size={16} />{error}</p>}
    </div>
  );
}
