// Small progressive enhancements: every page still works without JavaScript.

// ---------- Toasts: dismiss on click, fade out after a few seconds ----------
document.querySelectorAll('.toast').forEach(function (toast) {
  const hide = function () { toast.classList.add('hide'); };
  toast.querySelector('.toast-x').addEventListener('click', hide);
  setTimeout(hide, toast.classList.contains('toast-error') ? 8000 : 4000);
});

// ---------- Loading state: disable the submit button while the form is sent ----------
document.addEventListener('submit', function (e) {
  if (e.defaultPrevented) return; // e.g. the user cancelled a confirm() dialog
  const btn = e.target.querySelector('button[type=submit]');
  if (!btn) return;
  btn.dataset.label = btn.textContent;
  btn.textContent = btn.dataset.busy || 'Please wait…';
  btn.classList.add('loading');
  btn.disabled = true;
});

// pages restored with the Back button should not keep a disabled button
window.addEventListener('pageshow', function (e) {
  if (!e.persisted) return;
  document.querySelectorAll('button.loading').forEach(function (btn) {
    btn.textContent = btn.dataset.label;
    btn.classList.remove('loading');
    btn.disabled = false;
  });
});

// ---------- Photo limit: warn before uploading too many photos ----------
document.querySelectorAll('input[type=file][data-max]').forEach(function (input) {
  const hint = input.parentElement.querySelector('.field-hint');
  const form = input.form;
  function check() {
    const removed = form.querySelectorAll('.remove-photo:checked').length;
    const room = Number(input.dataset.max) - Number(input.dataset.existing || 0) + removed;
    const tooMany = input.files.length > room;
    const tooBig = Array.prototype.some.call(input.files, function (f) { return f.size > 2 * 1024 * 1024; });
    let msg = '';
    if (tooMany) msg = room > 0 ? 'You can add ' + room + ' more photo' + (room === 1 ? '' : 's') + '.' : 'Remove a current photo before adding new ones.';
    else if (tooBig) msg = 'Each photo must be 2 MB or smaller.';
    input.setCustomValidity(msg);
    if (hint) {
      hint.textContent = msg || (input.files.length ? input.files.length + ' photo(s) selected' : '');
      hint.classList.toggle('bad', !!msg);
    }
  }
  input.addEventListener('change', check);
  form.querySelectorAll('.remove-photo').forEach(function (cb) { cb.addEventListener('change', check); });
});

// ---------- Character counter for long text fields ----------
document.querySelectorAll('textarea[data-counter]').forEach(function (ta) {
  const out = document.createElement('span');
  out.className = 'field-hint';
  ta.insertAdjacentElement('afterend', out);
  const update = function () { out.textContent = ta.value.length + ' / ' + ta.maxLength; };
  ta.addEventListener('input', update);
  update();
});
