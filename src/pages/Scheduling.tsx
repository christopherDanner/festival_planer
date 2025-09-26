import React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { useEffect } from 'react';
import Navigation from '@/components/Navigation';
import ShiftMatrix from '@/components/ShiftMatrix';

const Scheduling = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();

	// Get festivalId from URL params or location state
	const festivalId = searchParams.get('id') || location.state?.festivalId;

	useEffect(() => {
		if (!user) {
			navigate('/auth');
			return;
		}
		if (!festivalId) {
			navigate('/dashboard');
			return;
		}
	}, [user, festivalId, navigate]);

	if (!user || !festivalId) {
		return null;
	}

	return (
		<div className="min-h-screen bg-background">
			<Navigation />
			<div className="pt-16">
				<div className="container mx-auto px-4 py-8">
					<ShiftMatrix festivalId={festivalId} />
				</div>
			</div>
		</div>
	);
};

export default Scheduling;
