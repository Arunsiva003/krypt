import React, { useCallback, useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode.react';
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SaveIcon from '@mui/icons-material/Save';
import PageShell from '../Layout/PageShell';
import SectionHeader from '../Layout/SectionHeader';
import SurfacePanel from '../Layout/SurfacePanel';
import { useFeedback } from '../Feedback/FeedbackProvider';
import api from '../../api/client';
import {
  decryptBytesPackage,
  decryptTextPackage,
  deriveBitsHex,
  downloadBytes,
  downloadTextFile,
  encryptBytesPackage,
  encryptTextPackage,
  hashBytes,
  hashText,
  randomBase64,
  randomBytes,
  readFileAsArrayBuffer,
  readFileAsText,
} from '../../cryptoUtils';

const receiptRows = (rows) => (
  <Paper elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
    <Stack spacing={1}>
      {rows.map(([label, value]) => (
        <Stack key={label} direction="row" justifyContent="space-between" spacing={2}>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          <Typography variant="body2" fontWeight={800} textAlign="right">{value}</Typography>
        </Stack>
      ))}
    </Stack>
  </Paper>
);

const FileEncryptionTool = () => {
  const [mode, setMode] = useState('encrypt');
  const [file, setFile] = useState(null);
  const [passphrase, setPassphrase] = useState('');
  const [packageText, setPackageText] = useState('');
  const [resultName, setResultName] = useState('');
  const { notify } = useFeedback();

  const encrypt = async () => {
    if (!file || !passphrase.trim()) return notify('Choose a file and enter a passphrase.', 'warning');
    const bytes = await readFileAsArrayBuffer(file);
    const pkg = await encryptBytesPackage(bytes, passphrase, {
      originalName: file.name,
      mimeType: file.type || 'application/octet-stream',
      createdAt: new Date().toISOString(),
    });
    const content = JSON.stringify(pkg, null, 2);
    setPackageText(content);
    setResultName(`${file.name}.krypt`);
    downloadTextFile(`${file.name}.krypt`, content);
    notify('Encrypted .krypt package generated.', 'success');
  };

  const decrypt = async () => {
    if (!file || !passphrase.trim()) return notify('Choose a .krypt package and enter its passphrase.', 'warning');
    try {
      const pkg = JSON.parse(await readFileAsText(file));
      const bytes = await decryptBytesPackage(pkg, passphrase);
      const name = pkg.originalName ? `decrypted-${pkg.originalName}` : 'decrypted-file';
      downloadBytes(name, bytes, pkg.mimeType || 'application/octet-stream');
      setPackageText(JSON.stringify({ decrypted: name, algorithm: pkg.algorithm, kdf: pkg.kdf }, null, 2));
      setResultName(name);
      notify('File decrypted.', 'success');
    } catch {
      notify('Unable to decrypt this package with that passphrase.', 'error');
    }
  };

  return (
    <ToolShell eyebrow="Secondary tool" title="File Encryption" description="Encrypt any file into a portable .krypt package or decrypt one locally.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
                  <MenuItem value="encrypt">Encrypt file</MenuItem>
                  <MenuItem value="decrypt">Decrypt .krypt package</MenuItem>
                </Select>
              </FormControl>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                {file ? file.name : mode === 'encrypt' ? 'Choose file' : 'Choose .krypt package'}
                <input type="file" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
              </Button>
              <TextField label="Passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} fullWidth />
              <Button variant="contained" startIcon={<LockOutlinedIcon />} onClick={mode === 'encrypt' ? encrypt : decrypt}>
                {mode === 'encrypt' ? 'Encrypt and download' : 'Decrypt and download'}
              </Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Typography variant="h6">Privacy receipt</Typography>
              {receiptRows([
                ['Algorithm', 'AES-GCM'],
                ['KDF method', 'PBKDF2-SHA-256'],
                ['Plaintext upload', 'Never leaves browser'],
                ['Result', resultName || 'Waiting'],
              ])}
              <TextField multiline minRows={9} value={packageText} placeholder="Encrypted package metadata appears here." InputProps={{ readOnly: true }} fullWidth />
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const HashVerifierTool = () => {
  const [inputMode, setInputMode] = useState('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [expected, setExpected] = useState('');
  const [result, setResult] = useState('');
  const { notify } = useFeedback();

  const calculate = async () => {
    if (inputMode === 'text' && !text) return notify('Enter text to hash.', 'warning');
    if (inputMode === 'file' && !file) return notify('Choose a file to hash.', 'warning');
    const digest = inputMode === 'text'
      ? await hashText(text, algorithm)
      : await hashBytes(new Uint8Array(await readFileAsArrayBuffer(file)), algorithm);
    setResult(digest);
    notify('Hash generated.', 'success');
  };

  const match = expected.trim() && result ? expected.trim().toLowerCase() === result.toLowerCase() : null;

  return (
    <ToolShell eyebrow="Secondary tool" title="Hash Verifier" description="Generate SHA hashes and compare expected values for integrity checks.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Input</InputLabel>
                <Select label="Input" value={inputMode} onChange={(event) => setInputMode(event.target.value)}>
                  <MenuItem value="text">Text</MenuItem>
                  <MenuItem value="file">File</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Algorithm</InputLabel>
                <Select label="Algorithm" value={algorithm} onChange={(event) => setAlgorithm(event.target.value)}>
                  <MenuItem value="SHA-256">SHA-256</MenuItem>
                  <MenuItem value="SHA-384">SHA-384</MenuItem>
                  <MenuItem value="SHA-512">SHA-512</MenuItem>
                </Select>
              </FormControl>
              {inputMode === 'text' ? (
                <TextField label="Text" multiline minRows={6} value={text} onChange={(event) => setText(event.target.value)} fullWidth />
              ) : (
                <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                  {file ? file.name : 'Choose file'}
                  <input type="file" hidden onChange={(event) => setFile(event.target.files?.[0] || null)} />
                </Button>
              )}
              <TextField label="Expected hash (optional)" value={expected} onChange={(event) => setExpected(event.target.value)} fullWidth />
              <Button variant="contained" onClick={calculate}>Generate hash</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="h6">Result</Typography>
                {match !== null ? <Chip color={match ? 'success' : 'error'} label={match ? 'Match' : 'Mismatch'} /> : null}
              </Stack>
              <TextField multiline minRows={10} value={result} placeholder="Hash output appears here." InputProps={{ readOnly: true }} fullWidth />
              <Button startIcon={<ContentCopyIcon />} disabled={!result} onClick={() => navigator.clipboard.writeText(result)}>Copy hash</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const words = ['anchor', 'cipher', 'ember', 'harbor', 'ivory', 'matrix', 'orbit', 'quartz', 'rivet', 'signal', 'tundra', 'velvet', 'warden', 'zenith'];

const PasswordGeneratorTool = () => {
  const [mode, setMode] = useState('password');
  const [length, setLength] = useState(20);
  const [symbols, setSymbols] = useState(true);
  const [numbers, setNumbers] = useState(true);
  const [avoidAmbiguous, setAvoidAmbiguous] = useState(true);
  const [output, setOutput] = useState('');

  const generate = useCallback(() => {
    if (mode === 'passphrase') {
      const bytes = randomBytes(5);
      setOutput([...bytes].map((byte) => words[byte % words.length]).join('-'));
      return;
    }
    const ambiguous = 'O0Il1';
    let chars = [
      'abcdefghijklmnopqrstuvwxyz',
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    ].join('');
    if (numbers) chars += '0123456789';
    if (symbols) chars += '!@#$%^&*()-_=+[]{};:,.?';
    if (avoidAmbiguous) chars = chars.split('').filter((char) => !ambiguous.includes(char)).join('');
    const bytes = randomBytes(length);
    setOutput([...bytes].map((byte) => chars[byte % chars.length]).join(''));
  }, [avoidAmbiguous, length, mode, numbers, symbols]);

  return (
    <ToolShell eyebrow="Secondary tool" title="Password Generator" description="Create crypto-random passwords and memorable passphrases without storing them.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Mode</InputLabel>
                <Select label="Mode" value={mode} onChange={(event) => setMode(event.target.value)}>
                  <MenuItem value="password">Password</MenuItem>
                  <MenuItem value="passphrase">Passphrase</MenuItem>
                </Select>
              </FormControl>
              {mode === 'password' ? (
                <>
                  <Typography gutterBottom>Length: {length}</Typography>
                  <Slider min={12} max={48} value={length} onChange={(event, value) => setLength(value)} />
                  <Stack direction="row" justifyContent="space-between"><Typography>Numbers</Typography><Switch checked={numbers} onChange={(event) => setNumbers(event.target.checked)} /></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography>Symbols</Typography><Switch checked={symbols} onChange={(event) => setSymbols(event.target.checked)} /></Stack>
                  <Stack direction="row" justifyContent="space-between"><Typography>Avoid ambiguous</Typography><Switch checked={avoidAmbiguous} onChange={(event) => setAvoidAmbiguous(event.target.checked)} /></Stack>
                </>
              ) : null}
              <Button variant="contained" onClick={generate}>Generate</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Typography variant="h6">Generated secret</Typography>
              <TextField value={output} placeholder="Click Generate to create a secret." multiline minRows={5} InputProps={{ readOnly: true }} fullWidth />
              <Button startIcon={<ContentCopyIcon />} onClick={() => navigator.clipboard.writeText(output)} disabled={!output}>Copy</Button>
              {receiptRows([['Random source', 'window.crypto'], ['Stored by Krypt', 'No'], ['Recovery', 'Not possible']])}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const SecureNotesTool = () => {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState(null);
  const [decrypted, setDecrypted] = useState('');
  const { notify } = useFeedback();

  const loadNotes = async () => {
    const response = await api.get('/api/rust/notes');
    setNotes(response.data);
  };

  useEffect(() => { loadNotes().catch(() => {}); }, []);

  const save = async () => {
    if (!title.trim() || !note.trim() || !passphrase.trim()) return notify('Title, note, and passphrase are required.', 'warning');
    const pkg = await encryptTextPackage(note, passphrase, { title, createdAt: new Date().toISOString() });
    await api.post('/api/rust/notes', {
      title,
      ciphertext: pkg.ciphertext,
      algorithm: pkg.algorithm,
      kdf: pkg.kdf,
      iterations: pkg.iterations,
      salt: pkg.salt,
      iv: pkg.iv,
    });
    setTitle('');
    setNote('');
    await loadNotes();
    notify('Encrypted note saved.', 'success');
  };

  const decrypt = async (record) => {
    if (!passphrase.trim()) return notify('Enter the note passphrase first.', 'warning');
    try {
      const plain = await decryptTextPackage(record, passphrase);
      setSelected(record);
      setDecrypted(plain);
    } catch {
      notify('Unable to decrypt this note with that passphrase.', 'error');
    }
  };

  const remove = async (record) => {
    await api.delete(`/api/rust/notes/${record.id}`);
    setSelected(null);
    setDecrypted('');
    await loadNotes();
    notify('Encrypted note deleted.', 'success');
  };

  return (
    <ToolShell eyebrow="Secondary tool" title="Secure Notes" description="Encrypt notes locally and save only ciphertext to Krypt history.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField label="Title" value={title} onChange={(event) => setTitle(event.target.value)} fullWidth />
              <TextField label="Note" value={note} onChange={(event) => setNote(event.target.value)} multiline minRows={7} fullWidth />
              <TextField label="Passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} fullWidth />
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save}>Encrypt and save</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Typography variant="h6">Saved encrypted notes</Typography>
              {notes.length ? notes.map((record) => (
                <Paper key={record.id} elevation={0} sx={{ p: 2, bgcolor: 'action.hover' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                    <Box>
                      <Typography fontWeight={800}>{record.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{record.algorithm} / {record.kdf}</Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <Button onClick={() => decrypt(record)}>Decrypt</Button>
                      <Button color="error" onClick={() => remove(record)}>Delete</Button>
                    </Stack>
                  </Stack>
                </Paper>
              )) : <Alert severity="info">No encrypted notes yet.</Alert>}
              {selected ? <TextField label={`Decrypted: ${selected.title}`} value={decrypted} multiline minRows={5} fullWidth InputProps={{ readOnly: true }} /> : null}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const MetadataCleanerTool = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [cleaned, setCleaned] = useState('');
  const { notify } = useFeedback();

  const choose = (nextFile) => {
    setFile(nextFile);
    setCleaned('');
    setPreview(nextFile ? URL.createObjectURL(nextFile) : '');
  };

  const clean = async () => {
    if (!file) return notify('Choose an image first.', 'warning');
    const image = new Image();
    image.src = preview;
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      canvas.getContext('2d').drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL(file.type || 'image/png');
      setCleaned(dataUrl);
      notify('Image re-encoded without embedded metadata.', 'success');
    };
  };

  const download = () => {
    if (!cleaned) return;
    const link = document.createElement('a');
    link.href = cleaned;
    link.download = `clean-${file.name.replace(/\.[^.]+$/, '')}.png`;
    link.click();
  };

  return (
    <ToolShell eyebrow="Secondary tool" title="Metadata Cleaner" description="Re-encode images to remove embedded metadata before sharing.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Button variant="outlined" component="label" startIcon={<CloudUploadIcon />}>
                {file ? file.name : 'Choose image'}
                <input type="file" accept="image/*" hidden onChange={(event) => choose(event.target.files?.[0] || null)} />
              </Button>
              <Button variant="contained" onClick={clean} disabled={!file}>Clean metadata</Button>
              <Button startIcon={<DownloadIcon />} onClick={download} disabled={!cleaned}>Download cleaned image</Button>
              {file ? receiptRows([['Original size', `${Math.round(file.size / 1024)} KB`], ['Cleaned through', 'Canvas re-encode'], ['Location data', 'Not copied into output']]) : null}
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            {preview ? <Box component="img" src={cleaned || preview} alt="Metadata cleaner preview" sx={{ width: '100%', maxHeight: 460, objectFit: 'contain', borderRadius: 2, bgcolor: 'action.hover' }} /> : <Alert severity="info">Image preview appears here.</Alert>}
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const KeyDerivationTool = () => {
  const [passphrase, setPassphrase] = useState('');
  const [salt, setSalt] = useState(randomBase64(12));
  const [iterations, setIterations] = useState(150000);
  const [result, setResult] = useState('');
  const [timeMs, setTimeMs] = useState(null);
  const { notify } = useFeedback();

  const derive = async () => {
    if (!passphrase.trim() || !salt.trim()) return notify('Enter passphrase and salt.', 'warning');
    const start = performance.now();
    const hex = await deriveBitsHex(passphrase, salt, iterations);
    setTimeMs(Math.round(performance.now() - start));
    setResult(hex);
  };

  return (
    <ToolShell eyebrow="Secondary tool" title="Key Derivation Preview" description="Learn how passphrases become stronger derived keys.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={5}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField label="Passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} fullWidth />
              <TextField label="Salt" value={salt} onChange={(event) => setSalt(event.target.value)} fullWidth />
              <Typography>Iterations: {iterations.toLocaleString()}</Typography>
              <Slider min={50000} max={400000} step={25000} value={iterations} onChange={(event, value) => setIterations(value)} />
              <Button variant="contained" onClick={derive}>Derive preview key</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={7}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField multiline minRows={8} value={result} placeholder="Derived key preview appears here." InputProps={{ readOnly: true }} fullWidth />
              {receiptRows([['KDF', 'PBKDF2-SHA-256'], ['Iterations', iterations.toLocaleString()], ['Time', timeMs === null ? 'Waiting' : `${timeMs} ms`]])}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const mod = (value, prime = 257) => ((value % prime) + prime) % prime;
const modPow = (base, exponent, prime = 257) => {
  let result = 1;
  let current = mod(base, prime);
  for (let exp = exponent; exp > 0; exp = Math.floor(exp / 2)) {
    if (exp % 2) result = mod(result * current, prime);
    current = mod(current * current, prime);
  }
  return result;
};
const inverse = (value) => modPow(value, 255);

const splitSecret = (secret, total, threshold) => {
  const bytes = new TextEncoder().encode(secret);
  return Array.from({ length: total }, (_, shareIndex) => {
    const x = shareIndex + 1;
    const values = [...bytes].map((byte) => {
      const coeffs = [byte, ...Array.from({ length: threshold - 1 }, () => randomBytes(1)[0] % 257)];
      return coeffs.reduce((sum, coeff, power) => mod(sum + coeff * modPow(x, power)), 0);
    });
    return { x, values };
  });
};

const reconstructSecret = (shares) => {
  const parsed = shares.map((share) => JSON.parse(share)).filter((share) => share?.x && Array.isArray(share.values));
  const length = parsed[0]?.values.length || 0;
  const bytes = [];
  for (let i = 0; i < length; i += 1) {
    let value = 0;
    for (let j = 0; j < parsed.length; j += 1) {
      const xj = parsed[j].x;
      let numerator = 1;
      let denominator = 1;
      for (let m = 0; m < parsed.length; m += 1) {
        if (m === j) continue;
        numerator = mod(numerator * -parsed[m].x);
        denominator = mod(denominator * (xj - parsed[m].x));
      }
      value = mod(value + parsed[j].values[i] * numerator * inverse(denominator));
    }
    bytes.push(value === 256 ? 0 : value);
  }
  return new TextDecoder().decode(new Uint8Array(bytes));
};

const SecretSplitterTool = () => {
  const [secret, setSecret] = useState('');
  const [total, setTotal] = useState(5);
  const [threshold, setThreshold] = useState(3);
  const [shares, setShares] = useState([]);
  const [inputShares, setInputShares] = useState('');
  const [recovered, setRecovered] = useState('');
  const { notify } = useFeedback();

  const create = () => {
    if (!secret.trim()) return notify('Enter a secret to split.', 'warning');
    setShares(splitSecret(secret, total, threshold).map((share) => JSON.stringify(share)));
  };

  const recover = () => {
    try {
      const parts = inputShares.split('\n').map((line) => line.trim()).filter(Boolean);
      setRecovered(reconstructSecret(parts));
    } catch {
      notify('Unable to reconstruct from those shares.', 'error');
    }
  };

  return (
    <ToolShell eyebrow="Labs" title="Secret Splitter" description="Split a secret into threshold shares for recovery and custody workflows.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField label="Secret" value={secret} onChange={(event) => setSecret(event.target.value)} multiline minRows={4} fullWidth />
              <Typography>Total shares: {total}</Typography>
              <Slider min={2} max={8} value={total} onChange={(event, value) => { setTotal(value); setThreshold(Math.min(threshold, value)); }} />
              <Typography>Threshold: {threshold}</Typography>
              <Slider min={2} max={total} value={threshold} onChange={(event, value) => setThreshold(value)} />
              <Button variant="contained" onClick={create}>Create shares</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField label="Generated shares" value={shares.join('\n')} multiline minRows={7} fullWidth InputProps={{ readOnly: true }} />
              <TextField label="Paste shares, one per line" value={inputShares} onChange={(event) => setInputShares(event.target.value)} multiline minRows={5} fullWidth />
              <Button onClick={recover}>Reconstruct</Button>
              {recovered ? <Alert severity="success">{recovered}</Alert> : null}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const PrivacyScannerTool = () => {
  const [text, setText] = useState('');
  const findings = useMemo(() => {
    const patterns = [
      ['Emails', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
      ['Phone-like values', /(?:\+?\d[\s-]?){9,14}\d/g],
      ['URLs', /https?:\/\/[^\s]+/gi],
      ['Long tokens', /[A-Za-z0-9_-]{28,}/g],
      ['API-key-like strings', /(api[_-]?key|secret|token|password)\s*[:=]\s*[^\s]+/gi],
    ];
    return patterns.map(([label, pattern]) => ({ label, matches: text.match(pattern) || [] })).filter((item) => item.matches.length);
  }, [text]);

  return (
    <ToolShell eyebrow="Labs" title="Privacy Risk Scanner" description="Scan text for common sensitive patterns before sharing.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <TextField label="Text to scan" value={text} onChange={(event) => setText(event.target.value)} multiline minRows={16} fullWidth />
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} alignItems="center"><SearchOutlinedIcon color="primary" /><Typography variant="h6">Findings</Typography></Stack>
              {findings.length ? findings.map((finding) => (
                <Alert key={finding.label} severity="warning">
                  <strong>{finding.label}:</strong> {finding.matches.slice(0, 4).join(', ')}
                </Alert>
              )) : <Alert severity="success">No common privacy risks detected yet.</Alert>}
              {receiptRows([['Scanner type', 'Pattern based'], ['Server upload', 'No'], ['Best next step', 'Review before sharing']])}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const SecureHandoffTool = () => {
  const [message, setMessage] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [pkg, setPkg] = useState(null);
  const [importText, setImportText] = useState('');
  const [decrypted, setDecrypted] = useState('');
  const { notify } = useFeedback();

  const create = async () => {
    if (!message.trim() || !passphrase.trim()) return notify('Message and passphrase are required.', 'warning');
    const next = await encryptTextPackage(message, passphrase, { type: 'secure-handoff', createdAt: new Date().toISOString() });
    setPkg(next);
    downloadTextFile('krypt-handoff.json', JSON.stringify(next, null, 2));
    notify('Secure handoff package generated.', 'success');
  };

  const open = async () => {
    try {
      setDecrypted(await decryptTextPackage(JSON.parse(importText), passphrase));
    } catch {
      notify('Unable to open this handoff with that passphrase.', 'error');
    }
  };

  const payload = pkg ? JSON.stringify(pkg) : '';

  return (
    <ToolShell eyebrow="Labs" title="Secure Handoff" description="Create an encrypted handoff package with a compact QR preview for small payloads.">
      <Grid container spacing={3} sx={{ width: '100%', m: 0 }}>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <Stack spacing={2}>
              <TextField label="Message" value={message} onChange={(event) => setMessage(event.target.value)} multiline minRows={6} fullWidth />
              <TextField label="Passphrase" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} fullWidth />
              <Button variant="contained" onClick={create}>Create handoff</Button>
              <TextField label="Import handoff JSON" value={importText} onChange={(event) => setImportText(event.target.value)} multiline minRows={5} fullWidth />
              <Button onClick={open}>Open handoff</Button>
            </Stack>
          </SurfacePanel>
        </Grid>
        <Grid item xs={12} md={6}>
          <SurfacePanel>
            <Stack spacing={2}>
              <Typography variant="h6">Package preview</Typography>
              {payload && payload.length < 1800 ? (
                <Box sx={{ display: 'grid', placeItems: 'center', p: 2, bgcolor: '#fff', borderRadius: 2 }}>
                  <QRCode value={payload} size={220} />
                </Box>
              ) : <Alert severity="info">Create a handoff to preview a QR for small packages.</Alert>}
              <TextField value={payload} multiline minRows={6} fullWidth InputProps={{ readOnly: true }} />
              {decrypted ? <Alert severity="success">{decrypted}</Alert> : null}
              {receiptRows([['Algorithm', 'AES-GCM'], ['Passphrase channel', 'Separate'], ['Plaintext stored', 'No']])}
            </Stack>
          </SurfacePanel>
        </Grid>
      </Grid>
    </ToolShell>
  );
};

const ToolShell = ({ eyebrow, title, description, children }) => (
  <PageShell maxWidth="xl">
    <Stack spacing={3}>
      <SectionHeader eyebrow={eyebrow} title={title} description={description} />
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Processing happens in your browser. Krypt shows a receipt so you know what was stored and what stayed local.
      </Alert>
      {children}
    </Stack>
  </PageShell>
);

const advancedTools = {
  fileEncryption: FileEncryptionTool,
  hashVerifier: HashVerifierTool,
  passwordGenerator: PasswordGeneratorTool,
  secureNotes: SecureNotesTool,
  metadataCleaner: MetadataCleanerTool,
  keyDerivation: KeyDerivationTool,
  secretSplitter: SecretSplitterTool,
  privacyScanner: PrivacyScannerTool,
  secureHandoff: SecureHandoffTool,
};

export const AdvancedToolWorkspace = ({ name }) => {
  const Component = advancedTools[name];
  return Component ? <Component /> : null;
};

export default AdvancedToolWorkspace;
