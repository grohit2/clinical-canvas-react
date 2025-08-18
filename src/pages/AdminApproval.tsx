import React, { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

const AdminApprovalPage: React.FC = () => {
    const { user } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [approvedUsers, setApprovedUsers] = useState<any[]>([]);
    const [deniedUsers, setDeniedUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            setError(null);
            try {
                const querySnapshot = await getDocs(collection(db, 'userApprovals'));
                const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setPendingUsers(users.filter((u: any) => u.approved === false && !u.denied));
                setApprovedUsers(users.filter((u: any) => u.approved === true));
                setDeniedUsers(users.filter((u: any) => u.denied === true));
            } catch (err: any) {
                setError('Failed to fetch users.');
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'userApprovals', userId), {
                approved: true,
                lastUpdated: serverTimestamp(),
            });
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
        } catch (err) {
            alert('Failed to approve user.');
        }
    };

    const handleDeny = async (userId: string) => {
        try {
            await updateDoc(doc(db, 'userApprovals', userId), {
                approved: false,
                denied: true,
                lastUpdated: serverTimestamp(),
            });
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
        } catch (err) {
            alert('Failed to deny user.');
        }
    };

    // Simple admin check: only allow access if email matches a known admin
    if (!user || user.email !== 'admin@hms.com') {
        return <div className="p-8 text-center">Access denied.</div>;
    }

    return (
        <div className="max-w-2xl mx-auto p-8">
            <h1 className="text-2xl font-bold mb-6">Pending User Approvals</h1>
            {loading && <div>Loading...</div>}
            {error && <div className="text-red-500 mb-4">{error}</div>}
            {pendingUsers.length === 0 && !loading && <div>No pending users.</div>}
            <ul>
                {pendingUsers.map(u => (
                    <li key={u.id} className="flex items-center justify-between border-b py-3">
                        <div>
                            <div>{u.email}</div>
                            {u.lastUpdated && (
                                <div className="text-xs text-gray-500">
                                    Last updated: {u.lastUpdated.seconds ? new Date(u.lastUpdated.seconds * 1000).toLocaleString() : ''}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <button className="bg-green-500 text-white px-3 py-1 rounded" onClick={() => handleApprove(u.id)}>Approve</button>
                            <button className="bg-red-500 text-white px-3 py-1 rounded" onClick={() => handleDeny(u.id)}>Deny</button>
                        </div>
                    </li>
                ))}
            </ul>

            <h2 className="text-xl font-bold mt-10 mb-4">Approved Users</h2>
            {approvedUsers.length === 0 && !loading && <div>No approved users.</div>}
            <ul>
                {approvedUsers.map(u => (
                    <li key={u.id} className="flex items-center justify-between border-b py-3">
                        <div>
                            <div>{u.email}</div>
                            {u.lastUpdated && (
                                <div className="text-xs text-gray-500">
                                    Last updated: {u.lastUpdated.seconds ? new Date(u.lastUpdated.seconds * 1000).toLocaleString() : ''}
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            <h2 className="text-xl font-bold mt-10 mb-4">Denied Users</h2>
            {deniedUsers.length === 0 && !loading && <div>No denied users.</div>}
            <ul>
                {deniedUsers.map(u => (
                    <li key={u.id} className="flex items-center justify-between border-b py-3">
                        <div>
                            <div>{u.email}</div>
                            {u.lastUpdated && (
                                <div className="text-xs text-gray-500">
                                    Last updated: {u.lastUpdated.seconds ? new Date(u.lastUpdated.seconds * 1000).toLocaleString() : ''}
                                </div>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AdminApprovalPage;
