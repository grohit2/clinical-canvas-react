/* App.jsx — hash-router:
     #/             Duty board
     #/patients     Patients list (global tab)
     #/patient/<pid>           Patient detail (Tasks + Rounds)
     #/task/<pid>/<tid>        Task detail
   Identity prompt overlay until a `me` is set in localStorage. */

const { useState, useEffect } = React;

function parseHash() {
  const h = (window.location.hash || "#/").replace(/^#/, "");
  const parts = h.split("/").filter(Boolean);
  if (parts.length === 0) return { route: "duty" };
  if (parts[0] === "patients" && parts.length === 1) return { route: "patients" };
  if (parts[0] === "register" && parts.length === 1) return { route: "register" };
  if (parts[0] === "task" && parts[1] && parts[2]) return { route: "task", patientId: parts[1], taskId: parts[2] };
  if (parts[0] === "patient" && parts[1]) return { route: "patient", patientId: parts[1] };
  return { route: "duty" };
}

function go(hash) { window.location.hash = hash; }

function App() {
  const [me, setMe] = useState(() => window.api.getIdentity());
  const [showIdentity, setShowIdentity] = useState(() => !window.api.getIdentity());
  const [route, setRoute] = useState(parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function pickIdentity(newMe) {
    setMe(newMe);
    setShowIdentity(false);
  }

  function changeIdentity() {
    setShowIdentity(true);
  }

  if (!me) {
    return (
      <React.Fragment>
        <TopBar title="Duty" />
        <EmptyState title="Sign in to your duty board" body="Pick yourself from the staff list to see tasks assigned to you." />
        <IdentityPicker onPicked={pickIdentity} onClose={() => {}} />
      </React.Fragment>
    );
  }

  let body;
  if (route.route === "task") {
    body = (
      <TaskDetail
        me={me}
        patientId={route.patientId}
        taskId={route.taskId}
        onBack={() => window.history.back()}
      />
    );
  } else if (route.route === "patient") {
    body = (
      <PatientTasks
        patientId={route.patientId}
        onBack={() => window.history.back()}
        onOpenTask={(t) => go(`#/task/${route.patientId}/${t.taskId}`)}
      />
    );
  } else if (route.route === "patients") {
    body = (
      <PatientsList
        me={me}
        onOpenPatient={(p) => go(`#/patient/${p.uid}`)}
        onChangeIdentity={changeIdentity}
      />
    );
  } else if (route.route === "register") {
    body = (
      <Register
        me={me}
        onOpenTask={(t) => {
          if (t._patientNav) return go(`#/patient/${t.patientUid}`);
          go(`#/task/${t.patientUid || t.patient_uid}/${t.taskId || t.task_id}`);
        }}
        onChangeIdentity={changeIdentity}
      />
    );
  } else {
    body = (
      <DutyBoard
        me={me}
        onOpenTask={(t) => go(`#/task/${t.patientUid}/${t.taskId}`)}
        onOpenPatient={(p) => go(`#/patient/${p.patientUid}`)}
        onChangeIdentity={changeIdentity}
      />
    );
  }

  const showTabbar = route.route === "duty" || route.route === "patients" || route.route === "register";

  return (
    <React.Fragment>
      {body}
      {showIdentity && (
        <IdentityPicker
          onPicked={pickIdentity}
          onClose={() => setShowIdentity(false)}
          defaultDepartment={me?.department || "General Surgery"}
        />
      )}
      {showTabbar && (
        <div className="tabbar">
          <button className={route.route === "duty" ? "active" : ""} onClick={() => go("#/")}>
            <span className="glyph">●</span>Duty
          </button>
          <button className={route.route === "patients" ? "active" : ""} onClick={() => go("#/patients")}>
            <span className="glyph">◐</span>Patients
          </button>
          <button className={route.route === "register" ? "active" : ""} onClick={() => go("#/register")}>
            <span className="glyph">▤</span>Register
          </button>
        </div>
      )}
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
